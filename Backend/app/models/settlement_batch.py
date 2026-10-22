
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)

from app.db.database import Base


class SettlementBatch(Base):
    __tablename__ = "vgf_settlement_batches"

    __table_args__ = (
        CheckConstraint(
            "period_end >= period_start",
            name="chk_vgf_batch_period",
        ),
        CheckConstraint(
            "total_orders >= 0",
            name="chk_vgf_batch_orders",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED')",
            name="chk_vgf_batch_status",
        ),
        UniqueConstraint(
            "restaurant_id",
            "period_start",
            "period_end",
            name="uq_vgf_batch_period",
        ),
    )

    batch_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    restaurant_id = Column(
        # Use the same UUID type as your Restaurant model.
        ForeignKey("vgf_restaurants.id"),
        nullable=False,
    )

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    settlement_date = Column(Date, nullable=False)

    total_orders = Column(Integer, nullable=False, default=0)

    gross_sales = Column(Numeric(12, 2), nullable=False, default=0)
    restaurant_discounts = Column(Numeric(12, 2), nullable=False, default=0)
    commission = Column(Numeric(12, 2), nullable=False, default=0)
    commission_tax = Column(Numeric(12, 2), nullable=False, default=0)
    other_fees = Column(Numeric(12, 2), nullable=False, default=0)
    refunds = Column(Numeric(12, 2), nullable=False, default=0)
    adjustments = Column(Numeric(12, 2), nullable=False, default=0)
    net_amount = Column(Numeric(12, 2), nullable=False, default=0)

    status = Column(String(20), nullable=False, default="PENDING")
    is_simulated = Column(Boolean, nullable=False, default=True)

    payout_reference = Column(String(100), nullable=True)
    failure_reason = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    processed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def orders(self) -> int:
        return self.total_orders

    @property
    def amount(self):
        return self.net_amount

