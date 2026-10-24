from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.schemas.owner import OwnerProfileResponse, OwnerProfileUpdate
from app.services.owner import get_owner_profile, update_owner_profile

router = APIRouter(
    prefix="/owners",
    tags=["Owners"],
)


@router.get(
    "/me",
    response_model=OwnerProfileResponse,
)
@router.get(
    "/me/profile",
    response_model=OwnerProfileResponse,
)
def get_profile(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return get_owner_profile(
        db=db,
        owner_id=owner.owner_id,
    )


@router.patch(
    "/me/profile",
    response_model=OwnerProfileResponse,
)
def update_profile(
    payload: OwnerProfileUpdate,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    return update_owner_profile(
        db=db,
        owner_id=owner.owner_id,
        payload=payload,
    )
