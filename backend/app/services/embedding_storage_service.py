import re
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.models.documents import Document
from app.services.embedding_service import generate_embedding


def generate_and_store_embeddings(
    db: Session,
    owner_id: int,
) -> int:
    chunks = (
        db.query(DocumentChunk)
        .join(
            Document,
            DocumentChunk.document_id == Document.id,
        )
        .filter(Document.owner_id == owner_id)
        .filter(DocumentChunk.embedding.is_(None))
        .order_by(
            DocumentChunk.document_id,
            DocumentChunk.chunk_index,
        )
        .all()
    )

    updated_count = 0

    try:
        for chunk in chunks:
            chunk.embedding = generate_embedding(chunk.content)
            updated_count += 1

        db.commit()
        return updated_count

    except Exception:
        db.rollback()
        raise




def search_similar_chunks(
    db: Session,
    query: str,
    owner_id: int,
    limit: int = 5,
    min_similarity: float = 0.35,
) -> list[dict]:
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if not 1 <= limit <= 20:
        raise ValueError("Limit must be between 1 and 20")

    if not 0.0 <= min_similarity <= 1.0:
        raise ValueError(
            "Minimum similarity must be between 0 and 1"
        )

    query_embedding = generate_embedding(query)

    distance_expression = DocumentChunk.embedding.cosine_distance(
        query_embedding
    )

    # Retrieve a wider candidate set for hybrid ranking.
    results = (
        db.query(
            DocumentChunk,
            Document.original_filename.label("document_name"),
            distance_expression.label("distance"),
        )
        .join(
            Document,
            DocumentChunk.document_id == Document.id,
        )
        .filter(Document.owner_id == owner_id)
        .filter(DocumentChunk.embedding.is_not(None))
        .order_by(distance_expression)
        .limit(max(limit * 4, 20))
        .all()
    )

    stop_words = {
    "what", "is", "the", "a", "an", "does", "do",
    "how", "many", "much", "for", "of", "in", "to",
    "my", "your", "and", "are", "was", "were"
    }

    query_terms = {
    term
    for term in re.findall(r"[a-z0-9]+", query.lower())
    if term not in stop_words
    }

    # Add related terms for common document-question wording.
    synonyms = {
        "project": {"projects", "application", "applications"},
        "projects": {"project", "application", "applications"},
        "cv": {"resume", "profile"},
        "resume": {"cv", "profile"},
        "technology": {"technologies", "tech", "stack"},
        "technologies": {"technology", "tech", "stack"},
    }

    expanded_terms = set(query_terms)

    for term in query_terms:
        expanded_terms.update(synonyms.get(term, set()))

    ranked_matches = []

    for chunk, document_name, distance in results:
        similarity = round(1 - float(distance), 4)


        content_terms = set(
            re.findall(r"[a-z0-9]+", chunk.content.lower())
        )

        overlap = expanded_terms.intersection(content_terms)

        # Keyword overlap supplements semantic similarity.
        keyword_score = (
            len(overlap) / len(expanded_terms)
            if expanded_terms
            else 0.0
        )

        # Keyword matches can rescue chunks with low semantic scores.
        combined_score = (0.85 * similarity) + (0.15 * keyword_score)
        

        if similarity < min_similarity:
            continue

        ranked_matches.append((
            combined_score,
            {
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_name": document_name,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity": similarity,
            },
        ))

    ranked_matches.sort(key=lambda item: item[0], reverse=True)

    return [
        item[1]
        for item in ranked_matches[:limit]
    ]