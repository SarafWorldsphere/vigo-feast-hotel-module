from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import get_dashboard
from app.services.restaurant import get_owner_restaurant

router = APIRouter(
    prefix="/restaurants/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "",
    response_model=DashboardResponse,
)
def dashboard(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_dashboard(
        db=db,
        restaurant_id=restaurant.id,
    )
