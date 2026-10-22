
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.schemas.refunds import (
    RefundCreate,
    RefundResponse,
    RefundListResponse,
)
from app.services.restaurant import get_owner_restaurant
from app.services.refunds import create_refund, list_refunds


router = APIRouter(
    prefix="/api/v1",
    tags=["Refunds"],
)


@router.post(
    "/complaints/{complaint_id}/refunds",
    response_model=RefundResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_complaint_refund(
    complaint_id: int,
    payload: RefundCreate,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.id,
    )

    return create_refund(
        db=db,
        restaurant_id=restaurant.id,
        owner_id=owner.id,
        complaint_id=complaint_id,
        payload=payload,
    )


@router.get(
    "/refunds",
    response_model=RefundListResponse,
    status_code=status.HTTP_200_OK,
)
def get_refunds(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return list_refunds(
        db=db,
        owner_id=owner.id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
