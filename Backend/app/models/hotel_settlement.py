from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
)
from sqlalchemy.dialects.postgresql import INET, UUID

from app.db.database import Base


class HotelSettlement(Base):
    __tablename__ = "vgf_hotel_settlements"

    settlement_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id"),
        nullable=False,
    )
    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id"),
        nullable=False,
    )
    franchisee_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )

    menu_value = Column(Numeric(12, 2), nullable=False, default=0)
    gst_amount = Column(Numeric(12, 2), nullable=False, default=0)
    commission_rate = Column(Numeric(5, 2), nullable=False, default=0)
    commission_amount = Column(Numeric(12, 2), nullable=False, default=0)
    net_amount = Column(Numeric(12, 2), nullable=False, default=0)
    net_balance = Column(Numeric(12, 2), nullable=False, default=0)

    hotel_amount = Column(Numeric(12, 2), nullable=False, default=0)
    rider_amount = Column(Numeric(12, 2), nullable=False, default=0)
    narayani_commission = Column(Numeric(12, 2), nullable=False, default=0)
    software_charge = Column(Numeric(12, 2), nullable=False, default=0)

    added_by = Column(String(255), nullable=True)
    added_date = Column(Date, nullable=True)
    added_time = Column(Time, nullable=True)
    added_ip = Column(
        String(45).with_variant(INET, "postgresql"),
        nullable=True,
    )

    last_updated_by = Column(String(255), nullable=True)
    last_updated_date = Column(Date, nullable=True)
    last_updated_time = Column(Time, nullable=True)
    last_updated_ip = Column(
        String(45).with_variant(INET, "postgresql"),
        nullable=True,
    )

    is_active = Column(Boolean, nullable=False, default=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
