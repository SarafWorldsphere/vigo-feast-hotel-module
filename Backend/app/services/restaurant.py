from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer_feedback import CustomerFeedback
from app.models.restaurant import Restaurant
from app.schemas.restaurant import (
    RestaurantAddressResponse,
    RestaurantAddressUpdate,
    RestaurantImagesResponse,
    RestaurantProfileResponse,
    RestaurantProfileUpdate,
    RestaurantRatingResponse,
)


def get_owner_restaurant(
    db: Session,
    owner_id: UUID,
) -> Restaurant:
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner_id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found for this owner.",
        )
    return restaurant


def get_restaurant_profile(
    db: Session,
    owner_id: UUID,
):
    result = (
        db.query(
            Restaurant.id,
            Restaurant.name,
            Restaurant.description,
            Restaurant.phone,
            Restaurant.email,
            Restaurant.logo_url,
            Restaurant.cover_image_url,
            Restaurant.address_line1,
            Restaurant.address_line2,
            Restaurant.city,
            Restaurant.state,
            Restaurant.postal_code,
            func.coalesce(
                func.avg(CustomerFeedback.rating),
                0,
            ).label("average_rating"),
            func.count(
                CustomerFeedback.feedback_id,
            ).label("total_reviews"),
        )
        .outerjoin(
            CustomerFeedback,
            (CustomerFeedback.restaurant_id == Restaurant.id)
            & (CustomerFeedback.is_active.is_(True))
            & (CustomerFeedback.is_deleted.is_(False)),
        )
        .filter(
            Restaurant.owner_id == owner_id,
            Restaurant.is_deleted.is_(False),
        )
        .group_by(
            Restaurant.id,
            Restaurant.name,
            Restaurant.description,
            Restaurant.phone,
            Restaurant.email,
            Restaurant.logo_url,
            Restaurant.cover_image_url,
            Restaurant.address_line1,
            Restaurant.address_line2,
            Restaurant.city,
            Restaurant.state,
            Restaurant.postal_code,
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    return {
        "id": result.id,
        "name": result.name,
        "description": result.description,
        "phone": result.phone,
        "email": result.email,
        "images": {
            "logo_url": result.logo_url,
            "cover_image_url": result.cover_image_url,
        },
        "address": {
            "address_line1": result.address_line1,
            "address_line2": result.address_line2,
            "city": result.city,
            "state": result.state,
            "postal_code": result.postal_code,
        },
        "rating": {
            "average": round(float(result.average_rating), 1),
            "total_reviews": int(result.total_reviews),
        },
    }



def update_restaurant_profile(
    db: Session,
    owner_id: UUID,
    payload: RestaurantProfileUpdate,
) -> RestaurantProfileResponse:
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    for field, value in updates.items():
        setattr(restaurant, field, value)

    db.commit()
    db.refresh(restaurant)

    return get_restaurant_profile(
        db=db,
        owner_id=owner_id,
    )



def update_restaurant_address(
    db: Session,
    owner_id: UUID,
    payload: RestaurantAddressUpdate,
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    for field, value in updates.items():
        setattr(restaurant, field, value)

    db.commit()
    db.refresh(restaurant)

    return restaurant

