
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.complaint import Complaint, ComplaintHistory
from app.schemas.complaints import ComplaintStatusUpdate


ALLOWED_TRANSITIONS = {
    "OPEN": {"UNDER_REVIEW", "RESOLVED", "REJECTED"},
    "UNDER_REVIEW": {"RESOLVED", "REJECTED"},
    "RESOLVED": set(),
    "REJECTED": set(),
}


def list_complaints(
    db: Session,
    restaurant_id: UUID,
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    query = db.query(Complaint).filter(
        Complaint.restaurant_id == restaurant_id,
        Complaint.is_deleted.is_(False),
        Complaint.is_active.is_(True),
    )

    if status:
        query = query.filter(Complaint.status == status)

    if category:
        query = query.filter(Complaint.category == category)

    total = query.count()

    items = (
        query.order_by(Complaint.created_at.desc(), Complaint.complaint_id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_complaint(
    db: Session,
    restaurant_id: UUID,
    complaint_id: int,
):
    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.complaint_id == complaint_id,
            Complaint.restaurant_id == restaurant_id,
            Complaint.is_deleted.is_(False),
            Complaint.is_active.is_(True),
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    return complaint


def update_complaint_status(
    db: Session,
    restaurant_id: UUID,
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    actor_id: str,
):
    try:
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

        previous_status = complaint.status
        new_status = payload.status

        if new_status not in ALLOWED_TRANSITIONS.get(
            previous_status, set()
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot change complaint status "
                    f"from {previous_status} to {new_status}"
                ),
            )

        note = payload.note.strip() if payload.note else None

        if new_status == "REJECTED" and not note:
            raise HTTPException(
                status_code=422,
                detail="A rejection reason is required",
            )

        complaint.status = new_status
        complaint.updated_at = __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        )

        if new_status == "RESOLVED":
            complaint.resolution_note = note
            complaint.resolved_at = complaint.updated_at

        elif new_status == "REJECTED":
            complaint.rejection_reason = note
            complaint.resolved_at = None

        history = ComplaintHistory(
            complaint_id=complaint.complaint_id,
            previous_status=previous_status,
            new_status=new_status,
            action=new_status,
            action_note=note,
            actor_type="RESTAURANT_OWNER",
            actor_id=actor_id,
        )

        db.add(history)
        db.flush()
        db.commit()
        db.refresh(complaint)

        return complaint

    except Exception:
        db.rollback()
        raise
