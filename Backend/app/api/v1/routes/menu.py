from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.menu_category import MenuCategory
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.menu import CategoryCreateRequest, CategoryResponse
from app.models.menu_item import MenuItem
from uuid import UUID

from app.schemas.menu import (
    MenuItemAvailabilityUpdateRequest,
    MenuItemCreateRequest,
    MenuItemResponse,
)

router = APIRouter(
    prefix="/menu",
    tags=["Menu Management"],
)


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
        image_url=request.image_url,
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

    return menu_item


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

    return (
        db.query(MenuItem)
        .filter(
            MenuItem.restaurant_id == restaurant.id,
            MenuItem.is_deleted.is_(False),
        )
        .order_by(MenuItem.display_order.asc(), MenuItem.created_at.desc())
        .all()
    )


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

    return menu_item
