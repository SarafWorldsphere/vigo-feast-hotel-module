from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.menu_category import MenuCategory
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.menu import CategoryCreateRequest, CategoryResponse

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
            func.lower(func.coalesce(MenuCategory.name, MenuCategory.category_name)) == func.lower(trimmed_name),
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

    # 5. Insert into nfd_menu_categories
    category = MenuCategory(
        restaurant_id=restaurant.id,
        name=trimmed_name,
        category_name=trimmed_name,
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

    for cat in categories:
        if not cat.name and cat.category_name:
            cat.name = cat.category_name

    return categories
