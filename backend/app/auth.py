"""Password hashing (argon2) and JWT helpers."""

import os
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me-0123456789abcdef")
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(hours=24)

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_token(user_id: int, email: str) -> str:
    claims = {"sub": str(user_id), "email": email, "exp": datetime.now(timezone.utc) + TOKEN_TTL}
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
