from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.offer import OfferCategory, OfferItem
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.offer import OfferListResponse, OfferResponse
from app.services.offer import get_offers


router = APIRouter(
    prefix="/offers",
    tags=["Offers"],
)


@router.get(
    "",
    response_model=OfferListResponse,
)
def list_offers(
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    # Resolve restaurant_id from authenticated owner
    restaurant_id = getattr(current_owner, "restaurant_id", None)
    if not restaurant_id:
        restaurant = (
            db.query(Restaurant)
            .filter(
                Restaurant.owner_id == current_owner.id,
                Restaurant.is_deleted.is_(False),
            )
            .first()
        )
        if not restaurant:
            return OfferListResponse(offers=[], total=0)
        restaurant_id = restaurant.id

    results = get_offers(
        db=db,
        restaurant_id=restaurant_id,
        status_filter=status_filter,
    )

    offer_ids = [offer.offer_id for offer, _, _ in results]
    category_map = {}
    item_map = {}

    if offer_ids:
        categories = (
            db.query(OfferCategory)
            .filter(OfferCategory.offer_id.in_(offer_ids))
            .all()
        )
        for cat in categories:
            category_map.setdefault(cat.offer_id, []).append(cat.category_id)

        items = (
            db.query(OfferItem)
            .filter(OfferItem.offer_id.in_(offer_ids))
            .all()
        )
        for it in items:
            item_map.setdefault(it.offer_id, []).append(it.menu_item_id)

    offers = []

    for offer, times_used, discount_given in results:
        offers.append(
            OfferResponse(
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
                category_ids=category_map.get(offer.offer_id, []),
                menu_item_ids=item_map.get(offer.offer_id, []),
                times_used=times_used,
                discount_given=discount_given,
            )
        )

    return OfferListResponse(
        offers=offers,
        total=len(offers),
    )
