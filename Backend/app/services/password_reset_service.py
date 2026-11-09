import hashlib
import secrets

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


RESET_TOKEN_EXPIRY_MINUTES = 10


def create_reset_token(
    db: Session,
    owner_id,
) -> tuple[str, int]:

    now = datetime.now(timezone.utc)

    # Invalidate previous unused reset tokens.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.owner_id == owner_id,
        PasswordResetToken.used_at.is_(None),
    ).update(
        {"used_at": now},
        synchronize_session=False,
    )

    # Generate cryptographically secure token.
    raw_token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    expires_at = now + timedelta(
        minutes=RESET_TOKEN_EXPIRY_MINUTES
    )

    record = PasswordResetToken(
        owner_id=owner_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    db.add(record)
    db.commit()

    return raw_token, RESET_TOKEN_EXPIRY_MINUTES

