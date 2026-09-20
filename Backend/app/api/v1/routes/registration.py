from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_registration_application import (
    RestaurantRegistrationApplication,
)
from app.schemas.registration import (
    RegistrationStatusResponse,
    RegistrationSubmitRequest,
    RegistrationSubmitResponse,
)
from app.services.registration import submit_registration as submit_registration_service


router = APIRouter(
    prefix="/restaurants/registration",
    tags=["Restaurant Registration"],
)


@router.post(
    "/submit",
    response_model=RegistrationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_registration(
    request: RegistrationSubmitRequest,
    current_owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant_id, application_id = submit_registration_service(
        db,
        owner_id=current_owner.id,
        payload=request,
    )

    return RegistrationSubmitResponse(
        message="Restaurant registration submitted for verification",
        restaurant_id=restaurant_id,
        application_id=application_id,
        status="SUBMITTED",
    )


@router.get(
    "/status",
    response_model=RegistrationStatusResponse,
)
def get_registration_status(
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # 1. Identify owner from access token and find owner's restaurant
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No restaurant registration found",
        )

    # 2. Find registration application if it exists
    application = (
        db.query(RestaurantRegistrationApplication)
        .filter(RestaurantRegistrationApplication.restaurant_id == restaurant.id)
        .order_by(RestaurantRegistrationApplication.submitted_at.desc())
        .first()
    )

    # 3. Check if registration is approved or restaurant is active
    effective_status = "SUBMITTED"
    if application:
        effective_status = application.status

    if restaurant.status in ("ACTIVE", "APPROVED") or effective_status == "APPROVED":
        effective_status = "APPROVED"

    return RegistrationStatusResponse(
        application_id=str(application.id) if application else str(restaurant.id),
        restaurant_id=str(restaurant.id),
        restaurant_name=restaurant.name,
        status=effective_status,
        submitted_at=application.submitted_at if application else getattr(restaurant, "created_at", None),
        reviewed_at=application.reviewed_at if application else getattr(restaurant, "updated_at", None),
        rejection_reason=application.rejection_reason if application else None,
    )


