from datetime import date, datetime, time, timezone
from decimal import Decimal
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Time,
)
from sqlalchemy.dialects.postgresql import INET, UUID

from app.db.database import Base


class Offer(Base):
    __tablename__ = "vgf_offers"

    offer_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    offer_code = Column(
        String(50),
        nullable=True,
        unique=True,
    )

    offer_name = Column(
        String(150),
        nullable=False,
    )

    discount_type = Column(
        String(20),
        nullable=False,
    )

    discount_value = Column(
        Numeric(12, 2),
        nullable=False,
    )

    min_order_amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    max_discount_amount = Column(
        Numeric(12, 2),
        nullable=True,
    )

    valid_from = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    valid_to = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    status = Column(
        String(20),
        nullable=False,
    )

    franchisee_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )

    added_by = Column(
        String(255),
        nullable=True,
    )

    added_date = Column(
        Date,
        nullable=True,
    )

    added_time = Column(
        Time,
        nullable=True,
    )

    added_ip = Column(
        INET,
        nullable=True,
    )

    last_updated_by = Column(
        String(255),
        nullable=True,
    )

    last_updated_date = Column(
        Date,
        nullable=True,
    )

    last_updated_time = Column(
        Time,
        nullable=True,
    )

    last_updated_ip = Column(
        INET,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=True,
        default=True,
    )

    is_deleted = Column(
        Boolean,
        nullable=True,
        default=False,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_restaurants.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )


class OfferCategory(Base):
    __tablename__ = "vgf_offer_categories"

    offer_id = Column(
        BigInteger,
        ForeignKey(
            "vgf_offers.offer_id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_menu_categories.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )


class OfferItem(Base):
    __tablename__ = "vgf_offer_items"

    offer_id = Column(
        BigInteger,
        ForeignKey(
            "vgf_offers.offer_id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    menu_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_menu_items.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )