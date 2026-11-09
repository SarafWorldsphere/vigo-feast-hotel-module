import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.restaurant_owner import RestaurantOwner

import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv


load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured")


ALGORITHM = os.getenv("ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
)

REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")
)

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError("Password cannot exceed 72 bytes")

    return bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    password: str,
    password_hash: str,
) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def create_access_token(
    owner_id: str,
    token_version: int = 0
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": owner_id,
        "type": "access",
        "ver": token_version,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token_payload(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        if not payload.get("sub"):
            raise ValueError("Invalid token subject")

        # Existing tokens without "ver" are treated as version 0.
        if not isinstance(payload.get("ver", 0), int):
            raise ValueError("Invalid token version")

        return payload

    except JWTError:
        raise ValueError("Invalid or expired access token")


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        owner_id = payload.get("sub")

        if not owner_id:
            raise ValueError("Invalid token")

        return owner_id

    except JWTError:
        raise ValueError("Invalid or expired access token")


def create_password_reset_token(owner_id: str, phone: str, expires_seconds: int = 600) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_seconds)
    payload = {
        "sub": owner_id,
        "phone": phone,
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        if payload.get("type") != "password_reset":
            raise ValueError("Invalid token type")
        owner_id = payload.get("sub")
        if not owner_id:
            raise ValueError("Invalid token subject")
        return payload
    except JWTError:
        raise ValueError("Invalid or expired reset token")


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_refresh_token(token: str, token_hash: str) -> bool:
    computed = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if hmac.compare_digest(computed, token_hash):
        return True

    # Backward compatibility for legacy bcrypt hashes
    if token_hash.startswith("$2b$") or token_hash.startswith("$2a$"):
        try:
            token_digest = hashlib.sha256(token.encode("utf-8")).digest()
            return bcrypt.checkpw(
                token_digest,
                token_hash.encode("utf-8")
            )
        except Exception:
            return False

    return False


def get_current_owner(
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = access_token

    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = decode_access_token_payload(token)
        owner_id = payload["sub"]
        token_version = payload.get("ver", 0)

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.id == owner_id,
            RestaurantOwner.is_active.is_(True),
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner account not found or inactive",
        )

    if owner.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
        )

    return owner
