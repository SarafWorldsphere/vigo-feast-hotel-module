from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class OrderItem(Base):
    __tablename__ = "vgf_order_items"

    order_item_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    menu_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_menu_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity = Column(
        Integer,
        nullable=False,
    )
    unit_price = Column(
        Numeric(10, 2),
        nullable=False,
    )
    line_total = Column(
        Numeric(10, 2),
        nullable=False,
    )
    franchisee_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )
    added_by = Column(String(100), nullable=True)
    added_date = Column(Date, server_default=func.current_date(), nullable=True)
    added_time = Column(Time, server_default=func.current_time(), nullable=True)
    added_ip = Column(INET, nullable=True)
    last_updated_by = Column(String(100), nullable=True)
    last_updated_date = Column(Date, nullable=True)
    last_updated_time = Column(Time, nullable=True)
    last_updated_ip = Column(INET, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    order = relationship("Order", back_populates="items")
