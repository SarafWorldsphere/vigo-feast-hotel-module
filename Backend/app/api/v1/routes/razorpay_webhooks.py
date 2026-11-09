import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.refund import Refund
from app.services.settlements import register_completed_refund_recovery

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Razorpay Webhooks"])


def _verify_signature(body: bytes, signature: str | None) -> None:
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not signature or not secret:
        raise HTTPException(status_code=400, detail="Webhook signature is missing or not configured")
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")


@router.post("/api/v1/webhooks/razorpay")
@router.post("/api/v1/payments/razorpay/webhook", include_in_schema=False)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    _verify_signature(body, request.headers.get("X-Razorpay-Signature"))
    try:
        event = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    event_type = event.get("event")
    if event_type not in {"refund.created", "refund.processed", "refund.failed"}:
        # Payment events remain owned by the payment application; ignore rather
        # than accidentally changing existing payment handling.
        return {"status": "ignored", "event": event_type}
    entity = event.get("payload", {}).get("refund", {}).get("entity", {})
    gateway_id = entity.get("id")
    if not gateway_id:
        raise HTTPException(status_code=400, detail="Refund ID missing from webhook payload")
    refund = db.query(Refund).filter(Refund.execution_reference == gateway_id).with_for_update().first()
    if not refund:
        notes = entity.get("notes") or {}
        receipt = entity.get("receipt") or notes.get("vigo_refund_receipt")
        if receipt and receipt.startswith("vgf-refund-"):
            try:
                refund_id = int(receipt.removeprefix("vgf-refund-"))
                refund = db.query(Refund).filter(Refund.refund_id == refund_id).with_for_update().first()
            except ValueError:
                pass
    if not refund:
        logger.warning("Razorpay webhook has no local refund: %s", gateway_id)
        return {"status": "not_found"}

    # Terminal states are monotonic. Re-delivery is a successful no-op.
    if refund.status == "COMPLETED" and event_type != "refund.failed":
        return {"status": "duplicate", "refund_id": refund.refund_id}
    refund.execution_reference = gateway_id
    if event_type == "refund.failed":
        if refund.status != "COMPLETED":
            refund.status = "FAILED"
            refund.failure_reason = entity.get("error_description") or entity.get("error_reason") or "Refund failed at gateway"
    elif event_type == "refund.processed":
        refund.status = "COMPLETED"
        if refund.completed_at is None:
            refund.completed_at = datetime.now(timezone.utc)
        register_completed_refund_recovery(db, refund)
    else:
        # An accepted request is not completion.
        if refund.status not in {"COMPLETED", "FAILED"}:
            refund.status = "PROCESSING"
    db.commit()
    return {"status": "success", "refund_id": refund.refund_id, "new_status": refund.status}
