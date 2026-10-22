from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.complaints import (
    ComplaintCategory,
    ComplaintListResponse,
    ComplaintResponse,
    ComplaintStatus,
    ComplaintStatusUpdate,
)
from app.services.complaints import (
    get_complaint,
    list_complaints,
    update_complaint_status,
)
from app.services.restaurant import get_owner_restaurant


router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"],
)


@router.get("", response_model=ComplaintListResponse)
@router.get("/", response_model=ComplaintListResponse, include_in_schema=False)
def get_my_restaurant_complaints(
    status_filter: Optional[ComplaintStatus] = Query(
        None,
        alias="status",
        description="Filter by complaint status",
    ),
    category: Optional[ComplaintCategory] = Query(
        None,
        description="Filter by complaint category",
    ),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    """
    GET /api/v1/complaints
    List complaints for the authenticated restaurant owner's restaurant.
    """
    restaurant = get_owner_restaurant(db, current_owner.id)

    result = list_complaints(
        db=db,
        restaurant_id=restaurant.id,
        status=status_filter,
        category=category,
        limit=limit,
        offset=offset,
    )

    result["items"] = [
        ComplaintResponse.model_validate(item)
        for item in result["items"]
    ]

    return result


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint_detail(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    """
    GET /api/v1/complaints/{complaint_id}
    Get details of a specific complaint.
    """
    restaurant = get_owner_restaurant(db, current_owner.id)

    complaint = get_complaint(
        db=db,
        restaurant_id=restaurant.id,
        complaint_id=complaint_id,
    )

    return ComplaintResponse.model_validate(complaint)


@router.patch(
    "/{complaint_id}/status",
    response_model=ComplaintResponse,
)
def update_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    """
    PATCH /api/v1/complaints/{complaint_id}/status
    Transition a complaint status (UNDER_REVIEW, RESOLVED, REJECTED) with audit trail.
    """
    restaurant = get_owner_restaurant(db, current_owner.id)

    complaint = update_complaint_status(
        db=db,
        restaurant_id=restaurant.id,
        complaint_id=complaint_id,
        payload=payload,
        actor_id=str(current_owner.id),
    )

    return ComplaintResponse.model_validate(complaint)
