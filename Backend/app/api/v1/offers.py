from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.restaurant_owner import RestaurantOwner
from app.api.v1.routes.offers import router, list_offers
from app.schemas.offer import CreateOfferRequest, OfferResponse
from app.services.offer import (
    create_offer,
    get_owner_restaurant,
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
        status=offer.status,
        is_active=offer.is_active,
        category_ids=data.category_ids or [],
        menu_item_ids=data.menu_item_ids or [],
        times_used=0,
        discount_given=0,
    )


__all__ = ["router", "list_offers", "create_new_offer"]
