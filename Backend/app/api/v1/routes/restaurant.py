from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
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

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurants"],
)


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

