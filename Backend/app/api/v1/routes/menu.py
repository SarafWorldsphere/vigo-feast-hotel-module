from datetime import datetime, timezone
from typing import Literal
import uuid
from uuid import UUID

from botocore.exceptions import ClientError
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.media_upload import MediaUpload
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.menu import (
    CategoryCreateRequest,
    CategoryResponse,
    MenuItemAvailabilityUpdateRequest,
    MenuItemCreateRequest,
    MenuItemResponse,
)
from app.services.s3_service import (
    generate_upload_url,
    generate_view_url,
    get_object_metadata,
)

router = APIRouter(
    prefix="/menu",
    tags=["Menu Management"],
)


class MenuImageUploadRequest(BaseModel):
    content_type: Literal[
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    file_size_bytes: int = Field(gt=0, le=5 * 1024 * 1024)


@router.post("/images/upload-url")
def create_menu_image_upload_url(
    request: MenuImageUploadRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    extension_by_type = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }

    object_key = (
        f"restaurants/{restaurant.id}/menu/"
        f"{uuid.uuid4()}.{extension_by_type[request.content_type]}"
    )

    try:
        upload_url = generate_upload_url(
            object_key=object_key,
            content_type=request.content_type,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to generate image upload URL",
        )

    upload = MediaUpload(
        restaurant_id=restaurant.id,
        object_key=object_key,
        media_type="MENU_IMAGE",
        content_type=request.content_type,
        file_size_bytes=request.file_size_bytes,
        status="PENDING",
    )

    db.add(upload)
    db.commit()

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "content_type": request.content_type,
        "expires_in": 300,
    }


@router.post("/images/confirm")
def confirm_menu_image_upload(
    object_key: str | None = None,
    payload: dict | None = Body(None),
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    key = object_key or (payload.get("object_key") if isinstance(payload, dict) else None)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Field 'object_key' is required",
        )

    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    upload = (
        db.query(MediaUpload)
        .filter(
            MediaUpload.object_key == key,
            MediaUpload.restaurant_id == restaurant.id,
            MediaUpload.media_type == "MENU_IMAGE",
            MediaUpload.status == "PENDING",
        )
        .first()
    )

    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload record not found or already confirmed",
        )

    try:
        metadata = get_object_metadata(key)
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code in ("404", "NoSuchKey"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uploaded image not found in storage",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify image with storage service",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify image with storage service",
        )

    content_length = metadata.get("ContentLength", 0)
    if content_length <= 0 or content_length > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file size (must be between 1 byte and 5MB)",
        )

    s3_content_type = metadata.get("ContentType")
    if s3_content_type and s3_content_type != upload.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content-Type mismatch: expected {upload.content_type}, got {s3_content_type}",
        )

    upload.file_size_bytes = content_length
    upload.status = "CONFIRMED"
    upload.confirmed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(upload)

    return {
        "message": "Image upload confirmed successfully",
        "object_key": upload.object_key,
        "media_type": upload.media_type,
        "content_type": upload.content_type,
        "file_size_bytes": upload.file_size_bytes,
        "status": upload.status,
        "confirmed_at": upload.confirmed_at.isoformat() if upload.confirmed_at else None,
    }



@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    request: CategoryCreateRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # 1. Derive restaurant from authenticated owner
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found for this owner. Please complete registration first.",
        )

    # 2. Validate & normalize name (strip whitespace)
    trimmed_name = request.name.strip()
    if not trimmed_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name cannot be empty",
        )

    # 3. Check duplicate category name within this restaurant (case-insensitive)
    existing_category = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.restaurant_id == restaurant.id,
            MenuCategory.is_deleted.is_(False),
            func.lower(MenuCategory.name) == func.lower(trimmed_name),
        )
        .first()
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{trimmed_name}' already exists for your restaurant",
        )

    # 4. Automatically determine next display_order
    max_order = (
        db.query(func.max(MenuCategory.display_order))
        .filter(
            MenuCategory.restaurant_id == restaurant.id,
            MenuCategory.is_deleted.is_(False),
        )
        .scalar()
    )
    next_order = (max_order or 0) + 1

    # 5. Insert into vgf_menu_categories
    category = MenuCategory(
        restaurant_id=restaurant.id,
        name=trimmed_name,
        display_order=next_order,
        is_active=True,
        is_deleted=False,
        status="ACTIVE",
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
)
def list_categories(
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # 1. Derive restaurant from authenticated owner
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        return []

    # 2. Query categories ordered by display_order
    categories = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.restaurant_id == restaurant.id,
            MenuCategory.is_active.is_(True),
            MenuCategory.is_deleted.is_(False),
        )
        .order_by(MenuCategory.display_order.asc(), MenuCategory.created_at.asc())
        .all()
    )

    return categories


def build_menu_item_response(item: MenuItem) -> dict:
    data = MenuItemResponse.model_validate(item).model_dump()
    data["image_url"] = (
        generate_view_url(item.image_key)
        if item.image_key
        else None
    )
    return data


@router.post(
    "/items",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_menu_item(
    request: MenuItemCreateRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # 1. Get restaurant belonging to logged-in owner
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found for this owner. Please complete registration first.",
        )

    # 2. Verify or resolve category belonging to this restaurant
    category = None

    if request.category_id:
        category = (
            db.query(MenuCategory)
            .filter(
                MenuCategory.id == request.category_id,
                MenuCategory.restaurant_id == restaurant.id,
                MenuCategory.is_active.is_(True),
                MenuCategory.is_deleted.is_(False),
            )
            .first()
        )

    if not category and request.category_name:
        trimmed_cat = request.category_name.strip()
        category = (
            db.query(MenuCategory)
            .filter(
                func.lower(MenuCategory.name) == trimmed_cat.lower(),
                MenuCategory.restaurant_id == restaurant.id,
                MenuCategory.is_active.is_(True),
                MenuCategory.is_deleted.is_(False),
            )
            .first()
        )
        # If not found by name, create it for this restaurant
        if not category and trimmed_cat:
            max_cat_order = (
                db.query(func.max(MenuCategory.display_order))
                .filter(
                    MenuCategory.restaurant_id == restaurant.id,
                    MenuCategory.is_deleted.is_(False),
                )
                .scalar()
            ) or 0

            category = MenuCategory(
                restaurant_id=restaurant.id,
                name=trimmed_cat,
                display_order=max_cat_order + 1,
                is_active=True,
                is_deleted=False,
                status="ACTIVE",
            )
            db.add(category)
            db.commit()
            db.refresh(category)

    if not category:
        # Fallback to the first active category of the restaurant, or create a default "Main Course"
        category = (
            db.query(MenuCategory)
            .filter(
                MenuCategory.restaurant_id == restaurant.id,
                MenuCategory.is_active.is_(True),
                MenuCategory.is_deleted.is_(False),
            )
            .order_by(MenuCategory.display_order.asc())
            .first()
        )
        if not category:
            category = MenuCategory(
                restaurant_id=restaurant.id,
                name="Main Course",
                display_order=1,
                is_active=True,
                is_deleted=False,
                status="ACTIVE",
            )
            db.add(category)
            db.commit()
            db.refresh(category)

    if request.image_key:
        confirmed_upload = (
            db.query(MediaUpload)
            .filter(
                MediaUpload.object_key == request.image_key,
                MediaUpload.restaurant_id == restaurant.id,
                MediaUpload.media_type == "MENU_IMAGE",
                MediaUpload.status == "CONFIRMED",
            )
            .first()
        )

        if not confirmed_upload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image upload must be confirmed before attaching it to a menu item.",
            )

    # 3. Find the next display order inside this category
    max_order = (
        db.query(func.max(MenuItem.display_order))
        .filter(
            MenuItem.restaurant_id == restaurant.id,
            MenuItem.category_id == category.id,
            MenuItem.is_deleted.is_(False),
        )
        .scalar()
    )

    next_order = (max_order or 0) + 1

    # 4. Create menu item row in database
    menu_item = MenuItem(
        restaurant_id=restaurant.id,
        category_id=category.id,
        name=request.name,
        description=request.description,
        image_key=request.image_key,
        base_price=request.base_price,
        food_type=request.food_type,
        preparation_time_minutes=request.preparation_time_minutes,
        availability_status="AVAILABLE",
        display_order=next_order,
        is_active=True,
        is_deleted=False,
    )

    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)

    return build_menu_item_response(menu_item)


@router.get(
    "/items",
    response_model=list[MenuItemResponse],
)
def list_menu_items(
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == owner.id)
        .first()
    )

    if not restaurant:
        return []

    items = (
        db.query(MenuItem)
        .filter(
            MenuItem.restaurant_id == restaurant.id,
            MenuItem.is_deleted.is_(False),
        )
        .order_by(
            MenuItem.display_order.asc(),
            MenuItem.created_at.desc(),
        )
        .all()
    )

    results = []

    for item in items:
        results.append(build_menu_item_response(item))

    return results


@router.patch(
    "/items/{item_id}/availability",
    response_model=MenuItemResponse,
)
def update_menu_item_availability(
    item_id: UUID,
    request: MenuItemAvailabilityUpdateRequest,
    owner: RestaurantOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    # 1. Single query: verify item exists and belongs to the authenticated owner's restaurant
    menu_item = (
        db.query(MenuItem)
        .join(Restaurant, Restaurant.id == MenuItem.restaurant_id)
        .filter(
            MenuItem.id == item_id,
            Restaurant.owner_id == owner.id,
            MenuItem.is_deleted.is_(False),
        )
        .first()
    )

    if not menu_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found for your restaurant.",
        )

    # 2. Update availability and commit (avoids extra db.refresh round-trip over network)
    menu_item.availability_status = request.availability_status
    db.commit()

    return build_menu_item_response(menu_item)
