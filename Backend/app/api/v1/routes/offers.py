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
from app.services.offer import calculate_offer_status, get_offers


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
    results, category_map, item_map = get_offers(
        db=db,
        owner_id=current_owner.id,
        status_filter=status_filter,
    )

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
                status=calculate_offer_status(
                    offer.valid_from,
                    offer.valid_to,
                ),
                is_active=offer.is_active,
                category_ids=category_map.get(
                    offer.offer_id,
                    [],
                ),
                menu_item_ids=item_map.get(
                    offer.offer_id,
                    [],
                ),
                times_used=times_used,
                discount_given=discount_given,
            )
        )

    return OfferListResponse(
        offers=offers,
        total=len(offers),
    )
