import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.registration_document_upload import (
    RegistrationDocumentUpload,
)
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_registration_application import (
    RestaurantRegistrationApplication,
)
from app.schemas.document import (
    RegistrationDocumentConfirmRequest,
    RegistrationDocumentUploadRequest,
)
from app.schemas.registration import (
    RegistrationStatusResponse,
    RegistrationSubmitRequest,
    RegistrationSubmitResponse,
)
from app.services.registration import submit_registration as submit_registration_service
from app.services.s3_service import (
    generate_upload_url,
    get_object_metadata,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/restaurants/registration",
    tags=["Restaurant Registration"],
)

DOCUMENT_EXTENSIONS = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/documents/upload-url")
def create_registration_document_upload_url(
    payload: RegistrationDocumentUploadRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # Restaurant photos must be images, not PDFs.
    if (
        payload.document_type == "RESTAURANT_PHOTO"
        and payload.content_type not in IMAGE_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail="Restaurant photos must be JPEG, PNG, or WebP images.",
        )

    # Validate the file extension against its declared content type.
    extension = DOCUMENT_EXTENSIONS[payload.content_type]
    supplied_extension = Path(payload.file_name).suffix.lower().lstrip(".")

    allowed_extensions = {
        "application/pdf": {"pdf"},
        "image/jpeg": {"jpg", "jpeg"},
        "image/png": {"png"},
        "image/webp": {"webp"},
    }

    if supplied_extension not in allowed_extensions[payload.content_type]:
        raise HTTPException(
            status_code=400,
            detail="File extension does not match the content type.",
        )

    object_key = (
        f"registration-documents/{owner.id}/"
        f"{uuid.uuid4()}.{extension}"
    )

    upload = RegistrationDocumentUpload(
        owner_id=owner.id,
        object_key=object_key,
        document_type=payload.document_type,
        file_name=Path(payload.file_name).name,
        content_type=payload.content_type,
        file_size_bytes=payload.file_size_bytes,
        status="PENDING",
    )

    try:
        upload_url = generate_upload_url(
            object_key=object_key,
            content_type=payload.content_type,
        )
        db.add(upload)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to create registration document upload")
        raise HTTPException(
            status_code=500,
            detail="Could not initialize document upload.",
        )

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "content_type": payload.content_type,
        "expires_in": 300,
    }


@router.post("/documents/confirm")
def confirm_registration_document_upload(
    payload: RegistrationDocumentConfirmRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    upload = (
        db.query(RegistrationDocumentUpload)
        .filter(
            RegistrationDocumentUpload.owner_id == owner.id,
            RegistrationDocumentUpload.object_key == payload.object_key,
            RegistrationDocumentUpload.status == "PENDING",
        )
        .with_for_update()
        .first()
    )

    if not upload:
        raise HTTPException(
            status_code=404,
            detail="Pending document upload not found.",
        )

    expected_prefix = f"registration-documents/{owner.id}/"
    if not payload.object_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=400,
            detail="Invalid document object key.",
        )

    try:
        metadata = get_object_metadata(upload.object_key)
    except Exception:
        logger.exception("Could not verify registration document in S3")
        raise HTTPException(
            status_code=400,
            detail="Uploaded document could not be found in S3.",
        )

    actual_size = metadata.get("ContentLength", 0)
    actual_content_type = metadata.get("ContentType", "")

    if not 0 < actual_size <= MAX_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Document must be between 1 byte and 10 MB.",
        )

    if actual_size != upload.file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file size does not match the declared size.",
        )

    if actual_content_type != upload.content_type:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file content type does not match.",
        )

    upload.status = "CONFIRMED"
    upload.file_size_bytes = actual_size
    upload.confirmed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "success": True,
        "message": "Registration document uploaded successfully.",
        "document_type": upload.document_type,
        "file_name": upload.file_name,
        "object_key": upload.object_key,
        "content_type": upload.content_type,
        "file_size_bytes": actual_size,
    }


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
