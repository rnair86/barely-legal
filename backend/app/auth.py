"""Password hashing (argon2) and JWT helpers."""

import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Random per-process secret if unset; fine since the DB (and users) reset on every start.
JWT_SECRET = os.environ.get("JWT_SECRET") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(hours=24)
# Changes on every start. The DB (and its user ids) is recreated then, so tokens
# from a previous run must not resolve to whichever new user got the same id.
BOOT_ID = secrets.token_hex(8)

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_token(user_id: int, email: str) -> str:
    claims = {"sub": str(user_id), "email": email, "boot": BOOT_ID, "exp": datetime.now(timezone.utc) + TOKEN_TTL}
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


_bearer = HTTPBearer(auto_error=False)


def current_user_id(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> int:
    """FastAPI dependency: the signed-in user's id, or 401."""
    try:
        if creds is None:
            raise jwt.InvalidTokenError
        claims = decode_token(creds.credentials)
        if claims.get("boot") != BOOT_ID:
            raise jwt.InvalidTokenError
        return int(claims["sub"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Not signed in")
