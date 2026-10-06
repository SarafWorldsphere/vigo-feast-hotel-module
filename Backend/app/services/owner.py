from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.restaurant_owner import RestaurantOwner
from app.schemas.owner import OwnerProfileUpdate


def get_owner_profile(
    db: Session,
    owner_id: UUID,
):
    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.id == owner_id,
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=404,
            detail="Owner not found",
        )

    return owner


def update_owner_profile(
    db: Session,
    owner_id: UUID,
    payload: OwnerProfileUpdate,
):
    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.id == owner_id,
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=404,
            detail="Owner not found",
        )

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    if "email" in updates:
        existing_owner = (
            db.query(RestaurantOwner)
            .filter(
                RestaurantOwner.email == updates["email"],
                RestaurantOwner.id != owner_id,
                RestaurantOwner.is_deleted.is_(False),
            )
            .first()
        )

        if existing_owner:
            raise HTTPException(
                status_code=409,
                detail="Email is already in use",
            )

    if "phone" in updates and updates["phone"] is not None:
        existing_phone = (
            db.query(RestaurantOwner)
            .filter(
                RestaurantOwner.phone == updates["phone"],
                RestaurantOwner.id != owner_id,
                RestaurantOwner.is_deleted.is_(False),
            )
            .first()
        )

        if existing_phone:
            raise HTTPException(
                status_code=409,
                detail="Phone number is already in use",
            )

    for field, value in updates.items():
        setattr(owner, field, value)

    db.commit()
    db.refresh(owner)

    return owner
