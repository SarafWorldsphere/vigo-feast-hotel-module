
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.owner_otp import create_otp_request
from app.services.nimbus_sms import send_otp_sms


def request_owner_otp(
    db: Session,
    phone: str,
    purpose: str,
    language: str = "en",
    owner_id=None,
) -> str:
    """
    Create an OTP request and submit its SMS.

    Returns the request ID, never the OTP itself.
    """
    request_id, otp = create_otp_request(
        db=db,
        phone=phone,
        purpose=purpose,
        language=language,
        owner_id=owner_id,
    )

    try:
        import asyncio

        # Bridge to the async Nimbus client.
        asyncio.run(send_otp_sms(
            phone=phone,
            otp=otp,
            language=language,
        ))

    except Exception:
        try:
            db.execute(
                text("""
                    UPDATE public.vgf_restaurant_owner_otp_requests
                    SET expires_at = NOW()
                    WHERE id = :request_id
                """),
                {"request_id": request_id},
            )
            db.commit()
        except Exception:
            db.rollback()

        raise RuntimeError(
            "Unable to submit OTP SMS. Please try again later."
        )

    return request_id
