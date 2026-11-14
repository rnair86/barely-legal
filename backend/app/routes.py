import logging
import sqlite3
from typing import Annotated

from fastapi import APIRouter, HTTPException
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


@router.post("/chat")
def chat_turn(req: ChatRequest) -> chat.ChatTurn:
    try:
        return chat.run_chat(req.messages, req.document, req.values, req.terms)
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
