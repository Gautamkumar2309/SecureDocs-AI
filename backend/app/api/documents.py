
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.documents import Document
from app.models.document_chunk import DocumentChunk

from app.services.document_service import extract_text_from_file
from app.services.chunking_service import chunk_text
from app.services.rag_service import answer_document_question
from app.services.guardrail_service import validate_question

from app.services.embedding_storage_service import (
    generate_and_store_embeddings,
    search_similar_chunks,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


class AskQuestionRequest(BaseModel):
    question: str


UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()

    if not original_name or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, and TXT files are allowed",
        )

    destination = None
    document_saved = False

    try:
        content = file.file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size must not exceed 10 MB",
            )
        
        if extension == ".docx" and not content.startswith(b"PK\x03\x04"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is not a valid DOCX file.",
            )

        if extension == ".txt" and b"\x00" in content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded TXT file contains invalid binary data.",
            )

        stored_name = f"{uuid4().hex}{extension}"
        destination = UPLOAD_DIR / stored_name

        with destination.open("xb") as destination_file:
            destination_file.write(content)

        # Step 1: Extract text from the uploaded file.
        try:
            extracted_text = extract_text_from_file(
                str(destination),
                extension.lstrip("."),
            )
        except (ValueError, FileNotFoundError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Unable to extract text. The file may be empty, "
                    "encrypted, or unsupported."
                ),
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Document text extraction failed",
            )

        # Step 2: Split the extracted text into chunks.
        chunks = chunk_text(
            extracted_text,
            chunk_size=1000,
            chunk_overlap=200,
        )

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No usable text chunks were generated",
            )

        # Step 3: Save the document and its chunks.
        document = Document(
            owner_id=current_user.id,
            original_filename=original_name,
            stored_filename=stored_name,
            file_path=str(destination),
            file_type=extension.lstrip("."),
            file_size=len(content),
            status="PROCESSED",
            extracted_text=extracted_text,
        )

        try:
            db.add(document)
            db.flush()

            chunk_records = [
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk,
                )
                for index, chunk in enumerate(chunks)
            ]

            db.add_all(chunk_records)
            db.commit()
            db.refresh(document)

            document_saved = True

        except Exception as exc:
            db.rollback()
            print("DOCUMENT SAVE ERROR:", repr(exc))

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to save document and its chunks",
            )

        # Step 4: Automatically generate embeddings.
        # The embedding service commits the generated vectors.
        embedding_error = False
        embeddings_generated = 0

        try:
            embeddings_generated = generate_and_store_embeddings(
                db,
                owner_id=current_user.id,
            )

        except Exception as exc:
            db.rollback()
            embedding_error = True

            print("AUTOMATIC EMBEDDING ERROR:", repr(exc))

            # Keep the uploaded document and file.
            # Mark the document so that the failure is visible.
            try:
                db.refresh(document)
                document.status = "EMBEDDING_FAILED"
                db.commit()
                db.refresh(document)
            except Exception as status_exc:
                db.rollback()
                print(
                    "DOCUMENT STATUS UPDATE ERROR:",
                    repr(status_exc),
                )

        # Step 5: Return the upload and embedding result.
        if embedding_error:
            message = (
                "Document uploaded and chunked, but embedding "
                "generation failed. Retry using the "
                "generate-embeddings endpoint."
            )
        else:
            message = (
                "Document uploaded and embeddings generated successfully"
            )

        return {
            "message": message,
            "document_id": document.id,
            "original_filename": document.original_filename,
            "file_type": document.file_type,
            "size_bytes": document.file_size,
            "extracted_characters": len(extracted_text),
            "chunks_created": len(chunks),
            "embeddings_generated": embeddings_generated,
            "status": document.status,
            "uploaded_by": current_user.id,
        }

    except HTTPException:
        db.rollback()

        # Only remove the file if the document was not saved.
        if not document_saved and destination is not None:
            destination.unlink(missing_ok=True)

        raise

    except OSError as exc:
        db.rollback()
        print("UPLOAD FILE ERROR:", repr(exc))

        if not document_saved and destination is not None:
            destination.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read or save the uploaded file",
        )

    finally:
        file.file.close()


@router.post("/generate-embeddings")
def generate_document_embeddings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_count = generate_and_store_embeddings(
            db,
            owner_id=current_user.id,
        )

        return {
            "message": "Embedding generation completed",
            "chunks_updated": updated_count,
        }

    except Exception as exc:
        db.rollback()
        print("EMBEDDING GENERATION ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate document embeddings",
        )



@router.post("/search")
def search_documents(
    query: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty",
        )

    if not 1 <= limit <= 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 20",
        )

    try:
        results = search_similar_chunks(
            db=db,
            query=query,
            owner_id=current_user.id,
            limit=limit,
        )

        return {
            "query": query,
            "results_count": len(results),
            "results": results,
        }

    except Exception as exc:
        db.rollback()
        print("DOCUMENT SEARCH ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document search failed",
        )


@router.post("/ask")
def ask_document_question(
    request: AskQuestionRequest,
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = validate_question(request.question)

    try:
        result = answer_document_question(
            db=db,
            question=question,
            owner_id=current_user.id,
            limit=limit,
        )

        return {
            "question": question,
            "answer": result["answer"],
            "sources": result["sources"],
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        print("DOCUMENT QUESTION ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to answer the document question",
        )


@router.get("/")
def list_my_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_query = db.query(Document).filter(
        Document.owner_id == current_user.id
    )

    total_documents = base_query.count()

    documents = (
        base_query
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total_documents": total_documents,
        "documents_count": len(documents),
        "skip": skip,
        "limit": limit,
        "documents": [
            {
                "document_id": document.id,
                "original_filename": document.original_filename,
                "file_type": document.file_type,
                "file_size": document.file_size,
                "status": document.status,
                "created_at": document.created_at,
            }
            for document in documents
        ],
    }


@router.get("/{document_id}")
def get_document_details(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return {
        "document_id": document.id,
        "original_filename": document.original_filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "status": document.status,
        "extracted_characters": (
            len(document.extracted_text)
            if document.extracted_text
            else 0
        ),
        "created_at": document.created_at,
    }

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    file_path = Path(document.file_path)

    try:
        db.delete(document)
        db.commit()

    except Exception as exc:
        db.rollback()
        print("DOCUMENT DELETE ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete document",
        )

    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        print(f"WARNING: Unable to delete uploaded file: {file_path}")

    return {
        "message": "Document deleted successfully",
        "document_id": document_id,
    }
