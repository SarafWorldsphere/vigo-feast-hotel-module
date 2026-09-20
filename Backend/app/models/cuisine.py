from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class CuisineType(Base):
    __tablename__ = "vgf_cuisine_types"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True
    )

    name = Column(
        String(100),
        nullable=False,
        unique=True
    )


class RestaurantCuisine(Base):
    __tablename__ = "vgf_restaurant_cuisines"

    restaurant_id = Column(
        UUID(as_uuid=True),
        primary_key=True
    )

    cuisine_id = Column(
        UUID(as_uuid=True),
        primary_key=True
    )