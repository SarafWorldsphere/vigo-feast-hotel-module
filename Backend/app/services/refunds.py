
from datetime import datetime, timezone
from decimal import Decimal
import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.complaint import Complaint
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.restaurant import Restaurant
from app.schemas.refunds import RefundCreate
from app.services import razorpay_service

logger = logging.getLogger(__name__)


COD_METHODS = {"COD", "CASH_ON_DELIVERY"}

# Explicitly supported online payment method names.
ONLINE_METHODS = {
    "ONLINE",
    "UPI",
    "CARD",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "NETBANKING",
    "WALLET",
    "RAZORPAY",
    "CASHFREE",
    "PAYTM",
}

SUCCESSFUL_PAYMENT_STATUSES = {"COMPLETED", "SUCCESS", "PAID"}

# Reserve active refunds until final outcome is reconciled.
RESERVED_REFUND_STATUSES = (
    "PENDING",
    "PROCESSING",
    "COMPLETED",
)


def _apply_gateway_response(db: Session, refund: Refund, payload: dict) -> Refund:
    """Persist a gateway response in a short transaction after an HTTP call."""
    refund.execution_reference = payload.get("id") or refund.execution_reference
    refund.status = razorpay_service.map_refund_status(payload.get("status"))
    if refund.status == "COMPLETED":
        refund.completed_at = datetime.now(timezone.utc)
        from app.services.settlements import register_completed_refund_recovery
        register_completed_refund_recovery(db, refund)
    elif refund.status == "FAILED":
        refund.failure_reason = payload.get("error_description") or "Refund failed at gateway"
    db.commit()
    db.refresh(refund)
    return refund


def submit_razorpay_refund(db: Session, refund_id: int) -> Refund:
    """Submit a persisted refund request or reconcile an ambiguous prior attempt.

    No database transaction is kept open during the network call.  Retrying a
    PENDING/PROCESSING request always reconciles first, so a timeout cannot
    create another customer refund.
    """
    refund = db.query(Refund).filter(Refund.refund_id == refund_id).first()
    if not refund or refund.status in {"COMPLETED", "FAILED"}:
        return refund
    payment = db.query(Payment).filter(Payment.payment_id == refund.payment_id).first()
    if not payment or not payment.gateway_payment_ref:
        refund.status = "FAILED"
        refund.failure_reason = "Payment record is missing Razorpay payment ID"
        db.commit()
        return refund

    receipt = f"vgf-refund-{refund.refund_id}"
    known = razorpay_service.find_refund(
        payment.gateway_payment_ref, str(refund.idempotency_key), receipt
    )
    if known:
        return _apply_gateway_response(db, refund, known)

    try:
        response = razorpay_service.create_refund(
            payment.gateway_payment_ref, refund.amount, str(refund.idempotency_key), receipt
        )
        return _apply_gateway_response(db, refund, response)
    except razorpay_service.RazorpayAmbiguousError as exc:
        # It may already exist at Razorpay. A later retry/webhook reconciles it.
        refund.status = "PROCESSING"
        refund.failure_reason = None
        db.commit()
        logger.warning("Refund %s requires Razorpay reconciliation: %s", refund_id, exc)
        return refund
    except razorpay_service.RazorpayGatewayError as exc:
        refund.status = "FAILED"
        refund.failure_reason = str(exc)[:1000]
        db.commit()
        return refund


def create_refund(
    db: Session,
    restaurant_id: UUID,
    owner_id: UUID,
    complaint_id: int,
    payload: RefundCreate,
) -> Refund:
    try:
        # Serialize refund creation for this complaint.
        complaint = (
            db.query(Complaint)
            .filter(
                Complaint.complaint_id == complaint_id,
                Complaint.restaurant_id == restaurant_id,
                Complaint.is_deleted.is_(False),
                Complaint.is_active.is_(True),
            )
            .with_for_update()
            .first()
        )

        if not complaint:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found",
            )

        order = (
            db.query(Order)
            .filter(
                Order.order_id == complaint.order_id,
                Order.restaurant_id == restaurant_id,
                Order.is_deleted.is_(False),
                Order.is_active.is_(True),
            )
            .with_for_update()
            .first()
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found for this restaurant",
            )

        # Idempotent retry: return the original record only if
        # the same key and same request are being retried.
        existing_key = (
            db.query(Refund)
            .filter(
                Refund.idempotency_key == payload.idempotency_key
            )
            .first()
        )

        if existing_key:
            same_request = (
                existing_key.complaint_id == complaint_id
                and existing_key.order_id == order.order_id
                and existing_key.initiated_by_owner_id == owner_id
                and existing_key.amount == payload.amount
                and existing_key.reason == payload.reason.strip()
                and existing_key.destination_method
                == payload.destination_method
            )

            if same_request:
                return existing_key

            raise HTTPException(
                status_code=409,
                detail=(
                    "Idempotency key has already been used "
                    "for a different request"
                ),
            )

        if complaint.status != "RESOLVED":
            raise HTTPException(
                status_code=409,
                detail="Only resolved complaints can be refunded",
            )

        # One refund record per complaint.
        existing_refund = (
            db.query(Refund)
            .filter(Refund.complaint_id == complaint_id)
            .first()
        )

        if existing_refund:
            raise HTTPException(
                status_code=409,
                detail=(
                    "A refund already exists for this complaint. "
                    "Use its existing record for reconciliation."
                ),
            )

        payments = (
            db.query(Payment)
            .filter(
                Payment.order_id == order.order_id,
                Payment.is_active.is_(True),
                Payment.is_deleted.is_(False),
            )
            .with_for_update()
            .all()
        )

        if not payments:
            raise HTTPException(
                status_code=409,
                detail="No payment record exists for this order",
            )

        # Demo records must never authorize a real refund.
        # Allow creating a PENDING development record only when explicitly configured.
        is_demo = any(
            (payment.gateway_name or "").strip().upper() == "DEMO"
            or (payment.method or "").strip().lower() == "demo"
            for payment in payments
        )

        if is_demo:
            from app.core.config import ALLOW_DEMO_REFUND_CREATION

            if not ALLOW_DEMO_REFUND_CREATION:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Refund creation is disabled for demo payments. "
                        "Verified real-payment integration is required."
                    ),
                )

        successful_payments = [
            payment
            for payment in payments
            if (payment.payment_status or "").strip().upper()
            in SUCCESSFUL_PAYMENT_STATUSES
        ]

        if len(successful_payments) != 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Exactly one successful payment is required. "
                    "Payment reconciliation is needed."
                ),
            )

        payment = successful_payments[0]
        method = (payment.method or "").strip().upper()
        destination = payload.destination_method

        if method in COD_METHODS:
            if destination not in {"UPI", "BANK_ACCOUNT"}:
                raise HTTPException(
                    status_code=422,
                    detail="COD refunds require UPI or bank account",
                )
        elif method in ONLINE_METHODS:
            if destination != "ORIGINAL_PAYMENT_METHOD":
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Online refunds must use the original "
                        "payment method"
                    ),
                )
        elif is_demo:
            if destination not in {"ORIGINAL_PAYMENT_METHOD", "UPI", "BANK_ACCOUNT"}:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid destination method for demo refund",
                )
        else:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Unsupported payment method. "
                    "Payment method mapping must be configured first."
                ),
            )

        # Reserve every existing refund, including FAILED records,
        # until its outcome has been explicitly reconciled.
        reserved_amount = (
            db.query(
                func.coalesce(func.sum(Refund.amount), 0)
            )
            .filter(
                Refund.payment_id == payment.payment_id,
                Refund.status.in_(RESERVED_REFUND_STATUSES),
            )
            .scalar()
        )

        paid_amount = Decimal(str(payment.amount))
        previous_refunds = Decimal(str(reserved_amount or 0))
        requested_amount = payload.amount
        remaining = paid_amount - previous_refunds

        if remaining <= 0 or requested_amount > remaining:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Refund exceeds the remaining refundable balance "
                    f"of {max(remaining, Decimal('0')):.2f}"
                ),
            )

        refund = Refund(
            order_id=order.order_id,
            payment_id=payment.payment_id,
            complaint_id=complaint.complaint_id,
            initiated_by_owner_id=owner_id,
            amount=requested_amount,
            reason=payload.reason.strip(),
            destination_method=destination,
            idempotency_key=payload.idempotency_key,
            status="PENDING",
        )

        db.add(refund)
        db.commit()
        db.refresh(refund)

        # Razorpay is initiated only after the reservation has been committed.
        # COD remains in the established manual UPI/bank-account workflow.
        if (payment.gateway_name or "").upper() == "RAZORPAY":
            refund = submit_razorpay_refund(db, refund.refund_id)

        return refund

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "A duplicate refund or idempotency key was detected. "
                "Check the existing refund record before retrying."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


def list_refunds(
    db: Session,
    owner_id: UUID,
    status_filter: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    from app.services.restaurant import get_owner_restaurant

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    query = (
        db.query(Refund)
        .join(Order, Refund.order_id == Order.order_id)
        .filter(
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
            Order.is_active.is_(True),
        )
    )

    if status_filter:
        normalized_status = status_filter.strip().upper()

        allowed_statuses = {
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
        }

        if normalized_status not in allowed_statuses:
            raise HTTPException(
                status_code=422,
                detail="Invalid refund status",
            )

        query = query.filter(
            Refund.status == normalized_status
        )

    total = query.with_entities(
        func.count(Refund.refund_id)
    ).scalar() or 0

    items = (
        query
        .order_by(Refund.created_at.desc(), Refund.refund_id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
    }

