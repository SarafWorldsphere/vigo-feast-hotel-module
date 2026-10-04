from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models.offer import Offer, OfferCategory, OfferItem
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.restaurant import Restaurant
from app.schemas.offer import UpdateOfferRequest


ALLOWED_DISCOUNT_TYPES = {
    "PERCENTAGE",
    "FLAT",
    "MIN_ORDER",
    "ITEM",
    "COMBO",
    "BUY_X_GET_Y",
}


def calculate_offer_status(
    valid_from: datetime,
    valid_to: datetime,
) -> str:
    now = datetime.now(timezone.utc)

    # Make sure comparisons are timezone-aware.
    if valid_from.tzinfo is None:
        valid_from = valid_from.replace(tzinfo=timezone.utc)

    if valid_to.tzinfo is None:
        valid_to = valid_to.replace(tzinfo=timezone.utc)

    if now < valid_from:
        return "SCHEDULED"

    if now > valid_to:
        return "EXPIRED"

    return "ACTIVE"


def refresh_offer_status(offer: Offer) -> str:
    new_status = calculate_offer_status(
        offer.valid_from,
        offer.valid_to,
    )

    if offer.status != new_status:
        offer.status = new_status

    return new_status


def validate_offer_data(
    discount_type: str,
    discount_value: Decimal,
    min_order_amount: Decimal,
    max_discount_amount: Optional[Decimal],
    valid_from: datetime,
    valid_to: datetime,
) -> None:

    discount_type = discount_type.upper()

    if discount_type not in ALLOWED_DISCOUNT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported discount type: {discount_type}",
        )

    vf = valid_from if valid_from.tzinfo is not None else valid_from.replace(tzinfo=timezone.utc)
    vt = valid_to if valid_to.tzinfo is not None else valid_to.replace(tzinfo=timezone.utc)

    if vf >= vt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="valid_from must be earlier than valid_to.",
        )

    if discount_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="discount_value must be greater than 0.",
        )

    if min_order_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_order_amount cannot be negative.",
        )

    if max_discount_amount is not None and max_discount_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_discount_amount cannot be negative.",
        )

    if discount_type == "PERCENTAGE" and discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentage discount cannot exceed 100.",
        )


def validate_categories(
    db: Session,
    restaurant_id: UUID,
    category_ids: list[UUID],
) -> None:

    if not category_ids:
        return

    categories = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.id.in_(category_ids),
            MenuCategory.restaurant_id == restaurant_id,
            MenuCategory.is_deleted.is_(False),
        )
        .all()
    )

    found_ids = {category.id for category in categories}

    invalid_ids = set(category_ids) - found_ids

    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more categories do not belong to this restaurant.",
        )


def validate_menu_items(
    db: Session,
    restaurant_id: UUID,
    menu_item_ids: list[UUID],
) -> None:

    if not menu_item_ids:
        return

    items = (
        db.query(MenuItem)
        .filter(
            MenuItem.id.in_(menu_item_ids),
            MenuItem.restaurant_id == restaurant_id,
            MenuItem.is_deleted.is_(False),
        )
        .all()
    )

    found_ids = {item.id for item in items}

    invalid_ids = set(menu_item_ids) - found_ids

    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more menu items do not belong to this restaurant.",
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


def create_offer(
    db: Session,
    restaurant_id: UUID,
    data,
    added_by: Optional[str] = None,
    added_ip=None,
) -> Offer:

    validate_offer_data(
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        max_discount_amount=data.max_discount_amount,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
    )

    validate_categories(
        db,
        restaurant_id,
        data.category_ids,
    )

    validate_menu_items(
        db,
        restaurant_id,
        data.menu_item_ids,
    )

    # Check offer code uniqueness before inserting.
    if data.offer_code:
        existing_offer = (
            db.query(Offer)
            .filter(
                Offer.offer_code == data.offer_code,
                Offer.is_deleted.is_(False),
            )
            .first()
        )

        if existing_offer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Offer code already exists.",
            )

    status_value = calculate_offer_status(
        data.valid_from,
        data.valid_to,
    )

    now = datetime.now(timezone.utc)

    offer = Offer(
        offer_code=data.offer_code,
        offer_name=data.offer_name,
        discount_type=data.discount_type.upper(),
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        max_discount_amount=data.max_discount_amount,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        status=status_value,
        restaurant_id=restaurant_id,
        added_by=added_by,
        added_date=now.date(),
        added_time=now.time(),
        added_ip=added_ip,
        is_active=True,
        is_deleted=False,
    )

    try:
        db.add(offer)
        db.flush()

        # Add category mappings.
        for category_id in set(data.category_ids):
            db.add(
                OfferCategory(
                    offer_id=offer.offer_id,
                    category_id=category_id,
                )
            )

        # Add item mappings.
        for menu_item_id in set(data.menu_item_ids):
            db.add(
                OfferItem(
                    offer_id=offer.offer_id,
                    menu_item_id=menu_item_id,
                )
            )

        db.commit()
        db.refresh(offer)

        return offer

    except Exception:
        db.rollback()
        raise


def update_offer(
    db: Session,
    owner_id: UUID,
    offer_id: int,
    data: UpdateOfferRequest,
    updated_by: Optional[str] = None,
    updated_ip=None,
) -> Offer:
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    offer = (
        db.query(Offer)
        .filter(
            Offer.offer_id == offer_id,
            Offer.restaurant_id == restaurant.id,
            Offer.is_deleted.is_(False),
        )
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found.",
        )

    discount_type = (
        data.discount_type
        if data.discount_type is not None
        else offer.discount_type
    )
    discount_value = (
        data.discount_value
        if data.discount_value is not None
        else offer.discount_value
    )
    min_order_amount = (
        data.min_order_amount
        if data.min_order_amount is not None
        else offer.min_order_amount
    )
    max_discount_amount = (
        data.max_discount_amount
        if data.max_discount_amount is not None
        else offer.max_discount_amount
    )
    valid_from = (
        data.valid_from
        if data.valid_from is not None
        else offer.valid_from
    )
    valid_to = (
        data.valid_to
        if data.valid_to is not None
        else offer.valid_to
    )

    validate_offer_data(
        discount_type=discount_type,
        discount_value=discount_value,
        min_order_amount=min_order_amount,
        max_discount_amount=max_discount_amount,
        valid_from=valid_from,
        valid_to=valid_to,
    )

    # 4. Validate categories if supplied
    if data.category_ids is not None:
        validate_categories(
            db=db,
            restaurant_id=restaurant.id,
            category_ids=data.category_ids,
        )

    # 5. Validate menu items if supplied
    if data.menu_item_ids is not None:
        validate_menu_items(
            db=db,
            restaurant_id=restaurant.id,
            menu_item_ids=data.menu_item_ids,
        )

    # 6. Check offer-code uniqueness
    if (
        data.offer_code is not None
        and data.offer_code != offer.offer_code
    ):
        existing_offer = (
            db.query(Offer)
            .filter(
                Offer.offer_code == data.offer_code,
                Offer.offer_id != offer_id,
                Offer.is_deleted.is_(False),
            )
            .first()
        )
        if existing_offer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Offer code already exists.",
            )

    if data.offer_code is not None:
        offer.offer_code = data.offer_code
    if data.offer_name is not None:
        offer.offer_name = data.offer_name
    if data.discount_type is not None:
        offer.discount_type = data.discount_type.upper()
    if data.discount_value is not None:
        offer.discount_value = data.discount_value
    if data.min_order_amount is not None:
        offer.min_order_amount = data.min_order_amount
    if data.max_discount_amount is not None:
        offer.max_discount_amount = data.max_discount_amount
    if data.valid_from is not None:
        offer.valid_from = data.valid_from
    if data.valid_to is not None:
        offer.valid_to = data.valid_to

    offer.status = calculate_offer_status(
        offer.valid_from,
        offer.valid_to,
    )

    now = datetime.now(timezone.utc)
    offer.last_updated_by = updated_by
    offer.last_updated_date = now.date()
    offer.last_updated_time = now.time()
    if updated_ip:
        offer.last_updated_ip = updated_ip

    try:
        if data.category_ids is not None:
            db.query(OfferCategory).filter(
                OfferCategory.offer_id == offer.offer_id
            ).delete()
            for category_id in set(data.category_ids):
                db.add(
                    OfferCategory(
                        offer_id=offer.offer_id,
                        category_id=category_id,
                    )
                )

        if data.menu_item_ids is not None:
            db.query(OfferItem).filter(
                OfferItem.offer_id == offer.offer_id
            ).delete()
            for menu_item_id in set(data.menu_item_ids):
                db.add(
                    OfferItem(
                        offer_id=offer.offer_id,
                        menu_item_id=menu_item_id,
                    )
                )

        db.commit()
        db.refresh(offer)

        return offer

    except Exception:
        db.rollback()
        raise


def toggle_offer(
    db: Session,
    owner_id: UUID,
    offer_id: int,
    is_active: bool,
    updated_by: Optional[str] = None,
    updated_ip=None,
) -> Offer:

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    offer = (
        db.query(Offer)
        .filter(
            Offer.offer_id == offer_id,
            Offer.restaurant_id == restaurant.id,
            Offer.is_deleted.is_(False),
        )
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found.",
        )

    offer.is_active = is_active

    now = datetime.now(timezone.utc)

    offer.last_updated_by = updated_by
    offer.last_updated_date = now.date()
    offer.last_updated_time = now.time()
    offer.last_updated_ip = updated_ip

    db.commit()
    db.refresh(offer)

    return offer


def delete_offer(
    db: Session,
    owner_id: UUID,
    offer_id: int,
    updated_by: Optional[str] = None,
    updated_ip=None,
) -> None:

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    offer = (
        db.query(Offer)
        .filter(
            Offer.offer_id == offer_id,
            Offer.restaurant_id == restaurant.id,
            Offer.is_deleted.is_(False),
        )
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found.",
        )

    offer.is_deleted = True
    offer.is_active = False

    now = datetime.now(timezone.utc)

    offer.last_updated_by = updated_by
    offer.last_updated_date = now.date()
    offer.last_updated_time = now.time()
    offer.last_updated_ip = updated_ip

    db.commit()


def get_offers(
    db: Session,
    owner_id: UUID,
    status_filter: Optional[str] = None,
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    now = datetime.now(timezone.utc)

    query = (
        db.query(
            Offer,
            func.count(Order.order_id).label("times_used"),
            func.coalesce(
                func.sum(Order.discount_amount),
                0,
            ).label("discount_given"),
        )
        .outerjoin(
            Order,
            (Order.offer_id == Offer.offer_id)
            & (Order.is_deleted.is_(False)),
        )
        .filter(
            Offer.restaurant_id == restaurant.id,
            Offer.is_deleted.is_(False),
        )
        .group_by(Offer.offer_id)
    )

    if status_filter:
        status_filter = status_filter.upper()

        if status_filter == "SCHEDULED":
            query = query.filter(
                Offer.valid_from > now
            )
        elif status_filter == "ACTIVE":
            query = query.filter(
                Offer.valid_from <= now,
                Offer.valid_to >= now,
            )
        elif status_filter == "EXPIRED":
            query = query.filter(
                Offer.valid_to < now
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid offer status.",
            )

    results = query.order_by(
        Offer.offer_id.desc()
    ).all()

    formatted_results = []
    for offer, times_used, discount_given in results:
        offer.status = calculate_offer_status(
            offer.valid_from,
            offer.valid_to,
        )
        formatted_results.append((offer, times_used, discount_given))

    offer_ids = [offer.offer_id for offer, _, _ in formatted_results]

    category_map = {}
    item_map = {}

    if offer_ids:
        category_rows = (
            db.query(
                OfferCategory.offer_id,
                OfferCategory.category_id,
            )
            .filter(
                OfferCategory.offer_id.in_(offer_ids)
            )
            .all()
        )

        item_rows = (
            db.query(
                OfferItem.offer_id,
                OfferItem.menu_item_id,
            )
            .filter(
                OfferItem.offer_id.in_(offer_ids)
            )
            .all()
        )

        for offer_id, category_id in category_rows:
            category_map.setdefault(
                offer_id,
                []
            ).append(category_id)

        for offer_id, menu_item_id in item_rows:
            item_map.setdefault(
                offer_id,
                []
            ).append(menu_item_id)

    return formatted_results, category_map, item_map