from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.cuisine import CuisineType
from app.schemas.cuisine import CuisineResponse


router = APIRouter(
    tags=["Cuisines"],
)


@router.get(
    "/cuisines",
    response_model=list[CuisineResponse],
)
def get_available_cuisines(
    db: Session = Depends(get_db),
):
    cuisines = (
        db.query(CuisineType)
        .order_by(CuisineType.name.asc())
        .all()
    )

    return cuisines
