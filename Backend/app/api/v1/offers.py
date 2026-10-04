from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.restaurant_owner import RestaurantOwner
from app.api.v1.routes.offers import router, list_offers
from app.schemas.offer import (
    CreateOfferRequest,
    UpdateOfferRequest,
    ToggleOfferRequest,
    OfferResponse,
)
from app.services.offer import (
    calculate_offer_status,
    create_offer,
    get_owner_restaurant,
    update_offer,
    toggle_offer,
    delete_offer,
)


@router.post(
    "",
    response_model=OfferResponse,
    status_code=201,
)
def create_new_offer(
    data: CreateOfferRequest,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=current_owner.id,
    )

    offer = create_offer(
        db=db,
        restaurant_id=restaurant.id,
        data=data,
        added_by=str(current_owner.id),
    )

    return OfferResponse(
        offer_id=offer.offer_id,
        offer_code=offer.offer_code,
        offer_name=offer.offer_name,
        discount_type=offer.discount_type,
        discount_value=offer.discount_value,
        min_order_amount=offer.min_order_amount,
        max_discount_amount=offer.max_discount_amount,
        valid_from=offer.valid_from,
        valid_to=offer.valid_to,
        status=calculate_offer_status(
            offer.valid_from,
            offer.valid_to,
        ),
        is_active=offer.is_active,
        category_ids=data.category_ids or [],
        menu_item_ids=data.menu_item_ids or [],
        times_used=0,
        discount_given=0,
    )


@router.patch(
    "/{offer_id}",
    response_model=OfferResponse,
)
def update_existing_offer(
    offer_id: int,
    data: UpdateOfferRequest,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    offer = update_offer(
        db=db,
        owner_id=current_owner.id,
        offer_id=offer_id,
        data=data,
        updated_by=str(current_owner.id),
    )
    return OfferResponse(
        offer_id=offer.offer_id,
        offer_code=offer.offer_code,
        offer_name=offer.offer_name,
        discount_type=offer.discount_type,
        discount_value=offer.discount_value,
        min_order_amount=offer.min_order_amount,
        max_discount_amount=offer.max_discount_amount,
        valid_from=offer.valid_from,
        valid_to=offer.valid_to,
        status=calculate_offer_status(
            offer.valid_from,
            offer.valid_to,
        ),
        is_active=offer.is_active,
        category_ids=[],
        menu_item_ids=[],
        times_used=0,
        discount_given=0,
    )


@router.patch(
    "/{offer_id}/toggle",
    response_model=OfferResponse,
)
def toggle_existing_offer(
    offer_id: int,
    data: ToggleOfferRequest,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    offer = toggle_offer(
        db=db,
        owner_id=current_owner.id,
        offer_id=offer_id,
        is_active=data.is_active,
        updated_by=str(current_owner.id),
    )

    return OfferResponse(
        offer_id=offer.offer_id,
        offer_code=offer.offer_code,
        offer_name=offer.offer_name,
        discount_type=offer.discount_type,
        discount_value=offer.discount_value,
        min_order_amount=offer.min_order_amount,
        max_discount_amount=offer.max_discount_amount,
        valid_from=offer.valid_from,
        valid_to=offer.valid_to,
        status=calculate_offer_status(
            offer.valid_from,
            offer.valid_to,
        ),
        is_active=offer.is_active,
        category_ids=[],
        menu_item_ids=[],
        times_used=0,
        discount_given=0,
    )


@router.delete(
    "/{offer_id}",
    status_code=204,
)
def delete_existing_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    delete_offer(
        db=db,
        owner_id=current_owner.id,
        offer_id=offer_id,
        updated_by=str(current_owner.id),
    )
    return None


__all__ = [
    "router",
    "list_offers",
    "create_new_offer",
    "update_existing_offer",
    "toggle_existing_offer",
    "delete_existing_offer",
]


