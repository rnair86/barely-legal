import pytest
from fastapi.testclient import TestClient

from app import auth, db


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    from app.main import app

    with TestClient(app) as c:  # runs lifespan -> fresh db
        yield c


def creds(email="a@example.com", password="password123"):
    return {"email": email, "password": password}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


@pytest.mark.parametrize("body", [creds(email=""), creds(email="notanemail"), creds(password="short")])
def test_signup_rejects_invalid_input(client, body):
    assert client.post("/api/auth/signup", json=body).status_code == 422


def test_signup_returns_valid_token(client):
    r = client.post("/api/auth/signup", json=creds())
    assert r.status_code == 201
    claims = auth.decode_token(r.json()["token"])
    assert claims["email"] == "a@example.com"


def test_signup_duplicate_email_conflicts_case_insensitive(client):
    client.post("/api/auth/signup", json=creds())
    r = client.post("/api/auth/signup", json=creds(email="A@Example.com"))
    assert r.status_code == 409


def test_password_is_stored_hashed(client):
    client.post("/api/auth/signup", json=creds())
    with db.connect() as conn:
        stored = conn.execute("SELECT password_hash FROM users").fetchone()[0]
    assert stored != "password123" and stored.startswith("$argon2")


def test_signin_success(client):
    client.post("/api/auth/signup", json=creds())
    r = client.post("/api/auth/signin", json=creds())
    assert r.status_code == 200 and "token" in r.json()


@pytest.mark.parametrize("body", [creds(password="wrong-password"), creds(email="nobody@example.com")])
def test_signin_bad_credentials(client, body):
    client.post("/api/auth/signup", json=creds())
    assert client.post("/api/auth/signin", json=body).status_code == 401


def test_db_recreated_on_startup(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    from app.main import app

    with TestClient(app) as c:
        c.post("/api/auth/signup", json=creds())
    with TestClient(app) as c:  # restart
        assert c.post("/api/auth/signup", json=creds()).status_code == 201


def test_serves_static_frontend(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("<h1>hello</h1>")
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
    from app.routes import router

    app = FastAPI()
    app.include_router(router)
    app.mount("/", StaticFiles(directory=tmp_path, html=True), name="static")
    c = TestClient(app)
    assert "hello" in c.get("/").text
    assert c.get("/api/health").status_code == 200
