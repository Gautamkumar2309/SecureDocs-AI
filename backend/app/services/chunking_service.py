
from typing import List


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[str]:
    """
    Split extracted document text into overlapping chunks.

    Args:
        text: Extracted document text.
        chunk_size: Maximum target characters per chunk.
        chunk_overlap: Number of characters shared between chunks.

    Returns:
        A list of non-empty text chunks.
    """

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if chunk_overlap < 0:
        raise ValueError("chunk_overlap cannot be negative")

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    text = text.strip()

    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        # Prefer breaking at a nearby word boundary.
        if end < text_length:
            boundary = text.rfind(" ", start, end)

            # Avoid producing a tiny chunk because of an early space.
            if boundary > start + chunk_size // 2:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        # Move forward while retaining overlap.
        next_start = end - chunk_overlap

        # Ensure progress even when the boundary adjustment is used.
        if next_start <= start:
            next_start = start + 1

        start = next_start

    return chunks
