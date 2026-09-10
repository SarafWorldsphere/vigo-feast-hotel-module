"""Atomic restaurant-owner registration submission workflow."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.business_details import RestaurantBusinessDetails
from app.models.cuisine import CuisineType, RestaurantCuisine
from app.models.document import RestaurantDocument
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_registration_application import (
    RestaurantRegistrationApplication,
)
from app.schemas.document import ALLOWED_DOCUMENT_TYPES
from app.schemas.registration import RegistrationSubmitRequest


def _conflict_if_exists(db: Session, column, value: str | None, message: str) -> None:
    if value and db.query(RestaurantBusinessDetails.id).filter(column == value).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


def submit_registration(
    db: Session,
    *,
    owner_id: UUID,
    payload: RegistrationSubmitRequest,
) -> tuple[UUID, UUID]:
    """Validate and persist a complete registration in one transaction.

    This function deliberately uses ORM objects directly; it never calls API
    routes or commits an individual registration section.
    """
    # get_current_owner has already read through this session.  End that
    # read-only transaction so the workflow owns one explicit transaction.
    db.rollback()

    cuisine_ids = payload.cuisine_ids
    if len(set(cuisine_ids)) != len(cuisine_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate cuisine IDs are not allowed",
        )

    document_types = [document.document_type for document in payload.documents]
    invalid_document_types = set(document_types) - ALLOWED_DOCUMENT_TYPES
    if invalid_document_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document type",
        )
    if len(set(document_types)) != len(document_types):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate document types are not allowed",
        )

    try:
        with db.begin():
            # Locking the owner serializes concurrent final submissions for
            # this owner, including the no-restaurant-yet case.
            owner = (
                db.query(RestaurantOwner)
                .filter(
                    RestaurantOwner.id == owner_id,
                    RestaurantOwner.is_active.is_(True),
                )
                .with_for_update()
                .first()
            )
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Owner account not found or inactive",
                )

            if db.query(Restaurant.id).filter(Restaurant.owner_id == owner_id).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A restaurant registration already exists for this owner",
                )

            _conflict_if_exists(
                db,
                RestaurantBusinessDetails.fssai_license_no,
                payload.business_details.fssai_license_no,
                "FSSAI license number is already registered",
            )
            _conflict_if_exists(
                db,
                RestaurantBusinessDetails.pan_number,
                payload.business_details.pan_number,
                "PAN number is already registered",
            )
            _conflict_if_exists(
                db,
                RestaurantBusinessDetails.gst_number,
                payload.business_details.gst_number,
                "GST number is already registered",
            )

            cuisines = db.query(CuisineType.id).filter(CuisineType.id.in_(cuisine_ids)).all()
            if len(cuisines) != len(cuisine_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more cuisine IDs do not exist",
                )

            restaurant_input = payload.restaurant
            restaurant = Restaurant(
                owner_id=owner_id,
                name=restaurant_input.name,
                description=restaurant_input.description,
                phone=restaurant_input.phone,
                email=restaurant_input.email,
                address_line1=restaurant_input.address_line1,
                address_line2=restaurant_input.address_line2,
                city=restaurant_input.city,
                state=restaurant_input.state,
                postal_code=restaurant_input.postal_code,
                latitude=restaurant_input.latitude,
                longitude=restaurant_input.longitude,
                status="OFFLINE",
            )
            db.add(restaurant)
            db.flush()

            business_input = payload.business_details
            db.add(RestaurantBusinessDetails(
                restaurant_id=restaurant.id,
                fssai_license_no=business_input.fssai_license_no,
                gst_number=business_input.gst_number,
                pan_number=business_input.pan_number,
                bank_name=business_input.bank_name,
                account_number=business_input.account_number,
                ifsc_code=business_input.ifsc_code,
                upi_id=business_input.upi_id,
            ))
            db.add_all([
                RestaurantCuisine(restaurant_id=restaurant.id, cuisine_id=cuisine_id)
                for cuisine_id in cuisine_ids
            ])
            db.add_all([
                RestaurantDocument(
                    restaurant_id=restaurant.id,
                    document_type=document.document_type,
                    file_url=document.file_url,
                    file_name=document.file_name,
                    mime_type=document.mime_type,
                    verification_status="UPLOADED",
                )
                for document in payload.documents
            ])

            application = RestaurantRegistrationApplication(
                restaurant_id=restaurant.id,
                status="SUBMITTED",
                submitted_at=datetime.now(timezone.utc),
            )
            db.add(application)
            # Surface constraint errors before committing.  The context manager
            # rolls back every pending insert if this fails.
            db.flush()
            restaurant_id, application_id = restaurant.id, application.id
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflicts with existing data",
        ) from exc

    return restaurant_id, application_id
