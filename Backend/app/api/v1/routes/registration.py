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
    application = (
        db.query(RestaurantRegistrationApplication)
        .join(
            Restaurant,
            Restaurant.id == RestaurantRegistrationApplication.restaurant_id,
        )
        .filter(
            Restaurant.owner_id == owner.id
        )
        .order_by(
            RestaurantRegistrationApplication.submitted_at.desc()
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No restaurant registration found",
        )

    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.id == application.restaurant_id)
        .first()
    )

    return RegistrationStatusResponse(
        application_id=str(application.id),
        restaurant_id=str(application.restaurant_id),
        restaurant_name=restaurant.name,
        status=application.status,
        submitted_at=application.submitted_at,
        reviewed_at=application.reviewed_at,
        rejection_reason=application.rejection_reason,
    )

