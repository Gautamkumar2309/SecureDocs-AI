
# from sentence_transformers import SentenceTransformer

# MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# model = SentenceTransformer(MODEL_NAME)


# def generate_embedding(text: str) -> list[float]:
#     if not text or not text.strip():
#         raise ValueError("Text cannot be empty")

#     embedding = model.encode(
#         text,
#         normalize_embeddings=True,
#         convert_to_numpy=True,
#     )

#     return embedding.tolist()


from functools import lru_cache
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model():
    return SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    model = get_embedding_model()

    embedding = model.encode(
        text,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    return embedding.tolist()

