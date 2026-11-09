from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func

from app.db.database import Base


class RefundRecovery(Base):
    """Amount the restaurant owes the platform for one completed refund.

    This is deliberately separate from settlement sales: a refund can be for
    an order in an earlier period and can be recovered over several batches.
    """

    __tablename__ = "vgf_refund_recoveries"

    recovery_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    refund_id = Column(BigInteger, ForeignKey("vgf_refunds.refund_id"), nullable=False, unique=True, index=True)
    restaurant_id = Column(ForeignKey("vgf_restaurants.id"), nullable=False, index=True)
    original_batch_id = Column(BigInteger, ForeignKey("vgf_settlement_batches.batch_id"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    recovered_amount = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    status = Column(String(20), nullable=False, default="OUTSTANDING", server_default="OUTSTANDING")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_vgf_refund_recovery_amount"),
        CheckConstraint("recovered_amount >= 0 AND recovered_amount <= amount", name="chk_vgf_refund_recovery_balance"),
        CheckConstraint("status IN ('OUTSTANDING', 'RECOVERED')", name="chk_vgf_refund_recovery_status"),
    )


class RefundRecoveryAllocation(Base):
    """Immutable application of a recovery against an unpaid settlement batch."""

    __tablename__ = "vgf_refund_recovery_allocations"

    allocation_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    recovery_id = Column(BigInteger, ForeignKey("vgf_refund_recoveries.recovery_id"), nullable=False, index=True)
    batch_id = Column(BigInteger, ForeignKey("vgf_settlement_batches.batch_id"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("recovery_id", "batch_id", name="uq_vgf_recovery_batch"),
        CheckConstraint("amount > 0", name="chk_vgf_refund_recovery_allocation_amount"),
    )
