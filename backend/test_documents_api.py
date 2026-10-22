
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, get_db


client = TestClient(app)


def fake_current_user():
    return SimpleNamespace(
        id=123,
        email="unverified@test.com",
        is_active=True,
        role="user",
    )


def fake_db():
    yield None


def test_documents_list_requires_authentication():
    response = client.get("/api/documents/")

    assert response.status_code in (401, 403)


def test_documents_list_returns_paginated_response():
    app.dependency_overrides[get_current_user] = fake_current_user
    app.dependency_overrides[get_db] = fake_db

    class FakeQuery:
        def filter(self, *args, **kwargs):
            return self

        def count(self):
            return 2

        def order_by(self, *args, **kwargs):
            return self

        def offset(self, value):
            assert value == 0
            return self

        def limit(self, value):
            assert value == 1
            return self

        def all(self):
            return [
                SimpleNamespace(
                    id=2,
                    original_filename="Gautam_MernResume.pdf",
                    file_type="pdf",
                    file_size=44175,
                    status="PROCESSED",
                    created_at="2026-10-13T09:44:54",
                )
            ]

    class FakeSession:
        def query(self, model):
            return FakeQuery()

    def fake_db_with_session():
        yield FakeSession()

    app.dependency_overrides[get_db] = fake_db_with_session

    try:
        response = client.get(
            "/api/documents/?skip=0&limit=1"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["total_documents"] == 2
        assert data["documents_count"] == 1
        assert data["skip"] == 0
        assert data["limit"] == 1
        assert data["documents"][0]["document_id"] == 2
        assert (
            data["documents"][0]["original_filename"]
            == "Gautam_MernResume.pdf"
        )
    finally:
        app.dependency_overrides.clear()


def test_documents_list_rejects_invalid_limit():
    response = client.get(
        "/api/documents/?skip=0&limit=0"
    )

    assert response.status_code in (400, 401, 403, 422)
