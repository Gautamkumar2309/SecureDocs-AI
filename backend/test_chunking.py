
from app.services.chunking_service import chunk_text


def test_empty_text():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text():
    text = "SecureDocs AI document processing"
    chunks = chunk_text(text)

    assert chunks == [text]


def test_multiple_chunks():
    text = " ".join(["document"] * 300)

    chunks = chunk_text(
        text,
        chunk_size=100,
        chunk_overlap=20,
    )

    assert len(chunks) > 1
    assert all(len(chunk) <= 100 for chunk in chunks)


def test_invalid_configuration():
    try:
        chunk_text("hello", chunk_size=100, chunk_overlap=100)
    except ValueError:
        pass
    else:
        raise AssertionError("Expected ValueError")


if __name__ == "__main__":
    test_empty_text()
    test_short_text()
    test_multiple_chunks()
    test_invalid_configuration()

    print("All chunking tests passed!")
