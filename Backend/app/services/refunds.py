
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.complaint import Complaint
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund import Refund
from app.schemas.refunds import RefundCreate, RefundRequestCreate
from app.services.restaurant import get_owner_restaurant

SUCCESSFUL_PAYMENT_STATUSES = {"COMPLETED", "SUCCESS", "PAID"}

# Reserve active refunds until final outcome is reconciled.
RESERVED_REFUND_STATUSES = (
    "PENDING",
    "APPROVED",
    "PROCESSING",
    "COMPLETED",
)

def create_refund(
    db: Session,
    restaurant_id: UUID,
    owner_id: UUID,
    complaint_id: int,
    payload: RefundCreate,
) -> Refund:
    """Compatibility wrapper for the existing complaint refund endpoint."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    request = RefundRequestCreate(
        order_id=complaint.order_id,
        complaint_id=complaint_id,
        **payload.model_dump(),
    )
    return create_refund_request(db, restaurant_id, owner_id, request)


def create_refund_request(
    db: Session,
    restaurant_id: UUID,
    owner_id: UUID,
    payload: RefundRequestCreate,
) -> Refund:
    """Create a PENDING owner request without contacting any payment gateway."""
    try:
        order = (
            db.query(Order)
            .filter(
                Order.order_id == payload.order_id,
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

        complaint = None
        if payload.complaint_id is not None:
            complaint = (
                db.query(Complaint)
                .filter(
                    Complaint.complaint_id == payload.complaint_id,
                    Complaint.order_id == order.order_id,
                    Complaint.restaurant_id == restaurant_id,
                    Complaint.is_deleted.is_(False),
                    Complaint.is_active.is_(True),
                )
                .with_for_update()
                .first()
            )
            if not complaint:
                raise HTTPException(status_code=404, detail="Complaint not found for this order")
            if complaint.status != "RESOLVED":
                raise HTTPException(status_code=409, detail="Only resolved complaints can be refunded")

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
                existing_key.complaint_id == payload.complaint_id
                and existing_key.order_id == order.order_id
                and existing_key.initiated_by_owner_id == owner_id
                and existing_key.amount == payload.amount
                and existing_key.reason == payload.reason.strip()
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

        # One request per complaint; duplicate requests without a complaint are
        # still stopped by the persisted idempotency key and payment balance.
        existing_refund = complaint and db.query(Refund).filter(Refund.complaint_id == complaint.complaint_id).first()
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
            restaurant_id=restaurant_id,
            payment_id=payment.payment_id,
            complaint_id=complaint.complaint_id if complaint else None,
            initiated_by_owner_id=owner_id,
            amount=requested_amount,
            reason=payload.reason.strip(),
            destination_method=payload.destination_method,
            idempotency_key=payload.idempotency_key,
            status="PENDING",
        )

        db.add(refund)
        db.commit()
        db.refresh(refund)

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
            "APPROVED",
            "REJECTED",
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


def get_owner_refund(db: Session, owner_id: UUID, refund_id: int) -> Refund:
    """Return one request only when it belongs to the authenticated owner."""
    restaurant = get_owner_restaurant(db=db, owner_id=owner_id)
    refund = (
        db.query(Refund)
        .join(Order, Refund.order_id == Order.order_id)
        .filter(
            Refund.refund_id == refund_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
            Order.is_active.is_(True),
        )
        .first()
    )
    if not refund:
        raise HTTPException(status_code=404, detail="Refund request not found")
    return refund

