import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.media_upload import MediaUpload
from app.schemas.restaurant import (
    RestaurantAddressResponse,
    RestaurantAddressUpdate,
    RestaurantProfileResponse,
    RestaurantProfileUpdate,
)
from app.services.restaurant import (
    get_owner_restaurant,
    get_restaurant_profile,
    update_restaurant_address,
    update_restaurant_profile,
)
from app.services.s3_service import (
    generate_upload_url,
    generate_view_url,
    get_object_metadata,
)

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurants"],
)


class RestaurantImageUploadRequest(BaseModel):
    image_type: Literal["logo", "cover"]
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    file_size_bytes: int = Field(gt=0, le=5 * 1024 * 1024)


class RestaurantImageConfirmRequest(BaseModel):
    object_key: str


IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def build_restaurant_image_key(
    restaurant_id,
    image_type: str,
    extension: str,
) -> str:
    return (
        f"restaurants/{restaurant_id}/profile/"
        f"{image_type}/{uuid.uuid4()}.{extension}"
    )


@router.post("/me/profile/images/upload-url")
def create_restaurant_image_upload_url(
    payload: RestaurantImageUploadRequest,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )
    object_key = build_restaurant_image_key(
        restaurant.id,
        payload.image_type,
        IMAGE_EXTENSIONS[payload.content_type],
    )
    upload_url = generate_upload_url(
        object_key=object_key,
        content_type=payload.content_type,
    )
    upload = MediaUpload(
        restaurant_id=restaurant.id,
        object_key=object_key,
        media_type=(
            "RESTAURANT_LOGO"
            if payload.image_type == "logo"
            else "RESTAURANT_COVER"
        ),
        content_type=payload.content_type,
        file_size_bytes=payload.file_size_bytes,
        status="PENDING",
    )
    db.add(upload)
    db.commit()

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "content_type": payload.content_type,
        "expires_in": 300,
    }


@router.post("/me/profile/images/confirm")
def confirm_restaurant_image_upload(
    payload: RestaurantImageConfirmRequest,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )
    upload = (
        db.query(MediaUpload)
        .filter(
            MediaUpload.restaurant_id == restaurant.id,
            MediaUpload.object_key == payload.object_key,
            MediaUpload.status == "PENDING",
            MediaUpload.media_type.in_(
                ["RESTAURANT_LOGO", "RESTAURANT_COVER"]
            ),
        )
        .first()
    )
    if not upload:
        raise HTTPException(
            status_code=404,
            detail="Pending restaurant image upload not found.",
        )
    # Ensure the key belongs to the expected restaurant/profile prefix.
    expected_prefix = f"restaurants/{restaurant.id}/profile/"
    if not payload.object_key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="Invalid object key.")
    try:
        metadata = get_object_metadata(payload.object_key)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image could not be found in S3.",
        )
    actual_size = metadata.get("ContentLength", 0)
    actual_content_type = metadata.get("ContentType", "")
    if not 0 < actual_size <= 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be between 1 byte and 5 MB.",
        )
    if actual_content_type != upload.content_type:
        raise HTTPException(
            status_code=400,
            detail="Image content type does not match requested type.",
        )

    upload.status = "CONFIRMED"
    upload.file_size_bytes = actual_size
    upload.confirmed_at = datetime.now(timezone.utc)

    if upload.media_type == "RESTAURANT_LOGO":
        restaurant.logo_url = payload.object_key
    elif upload.media_type == "RESTAURANT_COVER":
        restaurant.cover_image_url = payload.object_key

    db.commit()

    view_url = generate_view_url(payload.object_key)
    return {
        "success": True,
        "message": "Image upload confirmed successfully.",
        "image_type": "logo" if upload.media_type == "RESTAURANT_LOGO" else "cover",
        "object_key": payload.object_key,
        "image_url": view_url,
        "view_url": view_url,
    }



@router.get(
    "/me/profile",
    response_model=RestaurantProfileResponse,
)
def get_profile(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return get_restaurant_profile(
        db=db,
        owner_id=owner.owner_id,
    )



@router.patch(
    "/me/profile",
    response_model=RestaurantProfileResponse,
)
def update_profile(
    payload: RestaurantProfileUpdate,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return update_restaurant_profile(
        db=db,
        owner_id=owner.owner_id,
        payload=payload,
    )


@router.get(
    "/me/address",
    response_model=RestaurantAddressResponse,
)
def get_address(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )


@router.patch(
    "/me/address",
    response_model=RestaurantAddressResponse,
)
def update_address(
    payload: RestaurantAddressUpdate,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return update_restaurant_address(
        db=db,
        owner_id=owner.owner_id,
        payload=payload,
    )

