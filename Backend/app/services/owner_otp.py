
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import SECRET_KEY
from app.services.nimbus_sms import OTP_EXPIRY_MINUTES


OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60


def generate_otp() -> str:
    """Generate a cryptographically secure six-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    """Hash an OTP using the existing application secret."""
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not configured")

    return hmac.new(
        SECRET_KEY.encode("utf-8"),
        otp.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_hash(otp: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(otp), stored_hash)


def create_otp_request(
    db: Session,
    phone: str,
    purpose: str,
    language: str = "en",
    owner_id=None,
) -> tuple[str, str]:
    """
    Create and persist an OTP request.

    Returns (request_id, plaintext_otp).
    The plaintext OTP must only be used to send the SMS.
    """
    from sqlalchemy import text

    purpose = purpose.upper()
    language = language.lower()

    if purpose not in {"REGISTRATION", "LOGIN"}:
        raise ValueError("Invalid OTP purpose")

    if language not in {"en", "hi", "te"}:
        raise ValueError("Language must be en, hi, or te")

    now = datetime.now(timezone.utc)

    # Lock out rapid repeated sends for the same phone and purpose.
    recent = db.execute(
        text("""
            SELECT id
            FROM public.vgf_restaurant_owner_otp_requests
            WHERE phone = :phone
              AND purpose = :purpose
              AND created_at > :cutoff
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "phone": phone,
            "purpose": purpose,
            "cutoff": now - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
        },
    ).first()

    if recent:
        raise ValueError("Please wait before requesting another OTP")

    otp = generate_otp()
    otp_hash_value = hash_otp(otp)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    try:
        result = db.execute(
            text("""
                INSERT INTO public.vgf_restaurant_owner_otp_requests
                    (owner_id, phone, purpose, otp_hash, language, expires_at)
                VALUES
                    (:owner_id, :phone, :purpose, :otp_hash, :language, :expires_at)
                RETURNING id
            """),
            {
                "owner_id": owner_id,
                "phone": phone,
                "purpose": purpose,
                "otp_hash": otp_hash_value,
                "language": language,
                "expires_at": expires_at,
            },
        )
        request_id = str(result.scalar_one())
        db.commit()
    except Exception:
        db.rollback()
        raise

    return request_id, otp


def verify_otp_request(
    db: Session,
    request_id: str,
    phone: str,
    purpose: str,
    otp: str,
) -> bool:
    from sqlalchemy import text

    now = datetime.now(timezone.utc)
    purpose = purpose.upper()

    try:
        row = db.execute(
            text("""
                SELECT id, otp_hash, expires_at, verified_at, attempt_count
                FROM public.vgf_restaurant_owner_otp_requests
                WHERE id = :request_id
                  AND phone = :phone
                  AND purpose = :purpose
                FOR UPDATE
            """),
            {
                "request_id": request_id,
                "phone": phone,
                "purpose": purpose,
            },
        ).mappings().first()

        if not row or row["verified_at"] is not None:
            db.rollback()
            return False

        expires_at = row["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            db.rollback()
            return False

        if row["attempt_count"] >= OTP_MAX_ATTEMPTS:
            db.rollback()
            return False

        # Count every verification attempt, including an incorrect OTP.
        db.execute(
            text("""
                UPDATE public.vgf_restaurant_owner_otp_requests
                SET attempt_count = attempt_count + 1
                WHERE id = :request_id
            """),
            {"request_id": request_id},
        )

        is_valid = (
            isinstance(otp, str)
            and len(otp) == 6
            and otp.isdigit()
            and verify_otp_hash(otp, row["otp_hash"])
        )

        if not is_valid:
            db.commit()
            return False

        db.execute(
            text("""
                UPDATE public.vgf_restaurant_owner_otp_requests
                SET verified_at = :verified_at
                WHERE id = :request_id
            """),
            {"request_id": request_id, "verified_at": now},
        )

        db.commit()
        return True

    except Exception:
        db.rollback()
        raise
