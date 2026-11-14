import json
import logging
import sqlite3
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from . import auth, chat, db, documents

router = APIRouter(prefix="/api")


class Credentials(BaseModel):
    email: str = Field(min_length=3, pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    token: str


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/auth/signup", status_code=201)
def signup(creds: Credentials) -> TokenResponse:
    email = creds.email
    try:
        with db.connect() as conn:
            cur = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email, auth.hash_password(creds.password)),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Email already registered")
    return TokenResponse(token=auth.create_token(cur.lastrowid, email))


@router.post("/auth/signin")
def signin(creds: Credentials) -> TokenResponse:
    email = creds.email
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not auth.verify_password(row["password_hash"], creds.password):
        raise HTTPException(401, "Invalid email or password")
    return TokenResponse(token=auth.create_token(row["id"], email))


class ChatRequest(BaseModel):
    messages: list[chat.Message] = Field(min_length=1, max_length=50)
    document: chat.DocumentId | None = None
    values: chat.MndaValues = chat.MndaValues()
    terms: Annotated[dict[Annotated[str, Field(max_length=100)], chat.Text], Field(max_length=50)] = {}
    # The user's local date (YYYY-MM-DD), so "today" is right in their time zone.
    today: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.post("/chat")
def chat_turn(req: ChatRequest, _: int = Depends(auth.current_user_id)) -> chat.ChatTurn:
    try:
        return chat.run_chat(req.messages, req.document, req.values, req.terms, req.today)
    except Exception as e:
        logging.exception("Chat LLM call failed")
        raise HTTPException(502, "The AI service failed. Please try again.") from e


@router.get("/documents")
def list_documents() -> list[dict]:
    return [{"id": d.id, "name": d.name, "description": d.description} for d in documents.DOCUMENTS.values()]


@router.get("/documents/{doc_id}")
def get_document(doc_id: str) -> documents.Document:
    if doc_id not in documents.DOCUMENTS:
        raise HTTPException(404, "Unknown document")
    return documents.DOCUMENTS[doc_id]


class SavedDocument(BaseModel):
    doc_id: chat.DocumentId
    # Opaque client state (values, terms, chat messages); capped so one user cannot fill the disk.
    state: dict[str, Any]

    @field_validator("state")
    @classmethod
    def limit_size(cls, v: dict) -> dict:
        if len(json.dumps(v)) > 200_000:
            raise ValueError("state too large")
        return v


def _saved_row(conn: sqlite3.Connection, saved_id: int, user_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM saved_documents WHERE id = ? AND user_id = ?", (saved_id, user_id)).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    return row


def _saved_out(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "doc_id": row["doc_id"],
        "name": documents.DOCUMENTS[row["doc_id"]].name,
        "state": json.loads(row["state"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.get("/saved")
def list_saved(user_id: int = Depends(auth.current_user_id)) -> list[dict]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_documents WHERE user_id = ? ORDER BY updated_at DESC, id DESC", (user_id,)
        ).fetchall()
    # State is omitted from the list; fetch one document to open it.
    return [{k: v for k, v in _saved_out(r).items() if k != "state"} for r in rows]


@router.post("/saved", status_code=201)
def create_saved(body: SavedDocument, user_id: int = Depends(auth.current_user_id)) -> dict:
    with db.connect() as conn:
        cur = conn.execute(
            "INSERT INTO saved_documents (user_id, doc_id, state) VALUES (?, ?, ?)",
            (user_id, body.doc_id, json.dumps(body.state)),
        )
        return _saved_out(_saved_row(conn, cur.lastrowid, user_id))


@router.get("/saved/{saved_id}")
def get_saved(saved_id: int, user_id: int = Depends(auth.current_user_id)) -> dict:
    with db.connect() as conn:
        return _saved_out(_saved_row(conn, saved_id, user_id))


@router.put("/saved/{saved_id}")
def update_saved(saved_id: int, body: SavedDocument, user_id: int = Depends(auth.current_user_id)) -> dict:
    with db.connect() as conn:
        _saved_row(conn, saved_id, user_id)
        conn.execute(
            "UPDATE saved_documents SET doc_id = ?, state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (body.doc_id, json.dumps(body.state), saved_id),
        )
        return _saved_out(_saved_row(conn, saved_id, user_id))


@router.delete("/saved/{saved_id}", status_code=204)
def delete_saved(saved_id: int, user_id: int = Depends(auth.current_user_id)) -> None:
    with db.connect() as conn:
        _saved_row(conn, saved_id, user_id)
        conn.execute("DELETE FROM saved_documents WHERE id = ?", (saved_id,))
