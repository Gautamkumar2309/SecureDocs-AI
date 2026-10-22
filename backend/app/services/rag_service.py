from sqlalchemy.orm import Session

from app.models.documents import Document
from app.models.document_chunk import DocumentChunk
from app.services.embedding_storage_service import search_similar_chunks
from app.services.llm_service import generate_answer
from app.services.guardrail_service import validate_answer


def answer_document_question(
    db: Session,
    question: str,
    owner_id: int,
    limit: int = 5,
) -> dict:
    # Detect questions specifically about the latest uploaded document.
    question_lower = question.lower()

    latest_keywords = (
        "latest",
        "most recent",
        "newest",
        "last uploaded",
        "recently uploaded",
    )

    latest_document_question = (
        any(keyword in question_lower for keyword in latest_keywords)
        and any(
            keyword in question_lower
            for keyword in ("document", "file", "upload")
        )
    )

    # Special case: retrieve context only from the latest document.
    if latest_document_question:
        latest_document = (
            db.query(Document)
            .filter(Document.owner_id == owner_id)
            .order_by(Document.created_at.desc(), Document.id.desc())
            .first()
        )

        if latest_document is None:
            return {
                "answer": (
                    "You have not uploaded any documents yet."
                ),
                "sources": [],
            }

        
        chunks = (
            db.query(DocumentChunk)
            .join(
                Document,
                DocumentChunk.document_id == Document.id,
            )
            .filter(DocumentChunk.document_id == latest_document.id)
            .filter(Document.owner_id == owner_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )


        if not chunks:
            return {
                "answer": (
                    "The latest document has no indexed text available."
                ),
                "sources": [],
            }

        # Use ONLY the latest document's extracted text as context.
        context = latest_document.extracted_text or "\n\n".join(
            chunk.content for chunk in chunks
        )

        answer = generate_answer(
            question=question,
            context=(
                "Answer using only the following latest uploaded document. "
                "Identify the examination from the document's actual text. "
                "Do not substitute details from any other document. "
                "If the examination cannot be identified from this text, "
                "say that the document does not provide enough information.\n\n"
                f"Document name: {latest_document.original_filename}\n"
                f"Document ID: {latest_document.id}\n\n"
                f"{context}"
            ),
        )

        answer = validate_answer(answer)

        sources = [
            {
                "document_id": latest_document.id,
                "document_name": latest_document.original_filename,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "similarity": None,
            }
            for chunk in chunks[:limit]
        ]

        return {
            "answer": answer,
            "sources": sources,
        }

    
    # Normal questions continue to use semantic RAG search.
    results = search_similar_chunks(
        db=db,
        query=question,
        owner_id=owner_id,
        limit=limit,
    )

    if not results:
        return {
            "answer": (
                "I could not find relevant information in your "
                "uploaded documents."
            ),
            "sources": [],
        }

    context_parts = []
    sources = []

    for result in results:
        document = (
            db.query(Document)
            .filter(Document.id == result["document_id"])
            .filter(Document.owner_id == owner_id)
            .first()
        )

        if document is None:
            continue

        context_parts.append(
            f"Document name: {document.original_filename}\n"
            f"Document ID: {document.id}\n"
            f"Chunk index: {result['chunk_index']}\n"
            f"Chunk content:\n{result['content']}"
        )

        sources.append({
            "document_id": result["document_id"],
            "document_name": document.original_filename,
            "chunk_id": result["chunk_id"],
            "chunk_index": result["chunk_index"],
            "similarity": result["similarity"],
        })

    if not context_parts:
        return {
            "answer": (
                "I could not find relevant information in your "
                "uploaded documents."
            ),
            "sources": [],
        }

    context = "\n\n---\n\n".join(context_parts)

    answer = generate_answer(
        question=question,
        context=context,
    )

    answer = validate_answer(answer)

    return {
        "answer": answer,
        "sources": sources,
    }
