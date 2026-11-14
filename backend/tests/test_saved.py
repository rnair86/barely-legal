import pytest
from fastapi.testclient import TestClient

from app import db

STATE = {"values": {"purpose": "x"}, "terms": {}, "messages": [{"role": "user", "content": "hi"}]}
BODY = {"doc_id": "mutual-nda", "state": STATE}


def sign_up(c, email):
    token = c.post("/api/auth/signup", json={"email": email, "password": "password123"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    from app.main import app

    with TestClient(app) as c:
        c.headers.update(sign_up(c, "a@example.com"))
        yield c


def test_requires_sign_in(client):
    client.headers.pop("Authorization")
    assert client.get("/api/saved").status_code == 401
    assert client.post("/api/saved", json=BODY).status_code == 401
    assert client.get("/api/saved", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_create_list_get_update_delete(client):
    created = client.post("/api/saved", json=BODY)
    assert created.status_code == 201
    sid = created.json()["id"]
    assert created.json()["name"] == "Mutual Non-Disclosure Agreement"

    listed = client.get("/api/saved").json()
    assert [d["id"] for d in listed] == [sid] and "state" not in listed[0]

    assert client.get(f"/api/saved/{sid}").json()["state"] == STATE

    new_state = {**STATE, "terms": {"Fees": "$5"}}
    updated = client.put(f"/api/saved/{sid}", json={"doc_id": "csa", "state": new_state}).json()
    assert updated["doc_id"] == "csa" and updated["state"] == new_state

    assert client.delete(f"/api/saved/{sid}").status_code == 204
    assert client.get(f"/api/saved/{sid}").status_code == 404


def test_users_cannot_see_each_others_documents(client):
    sid = client.post("/api/saved", json=BODY).json()["id"]
    other = sign_up(client, "b@example.com")
    assert client.get("/api/saved", headers=other).json() == []
    assert client.get(f"/api/saved/{sid}", headers=other).status_code == 404
    assert client.put(f"/api/saved/{sid}", json=BODY, headers=other).status_code == 404
    assert client.delete(f"/api/saved/{sid}", headers=other).status_code == 404


def test_rejects_unknown_document_and_oversized_state(client):
    assert client.post("/api/saved", json={**BODY, "doc_id": "nope"}).status_code == 422
    big = {"doc_id": "csa", "state": {"x": "a" * 200_001}}
    assert client.post("/api/saved", json=big).status_code == 422


def test_token_from_previous_boot_is_rejected(client, monkeypatch):
    from app import auth

    monkeypatch.setattr(auth, "BOOT_ID", "other-boot")
    assert client.get("/api/saved").status_code == 401
