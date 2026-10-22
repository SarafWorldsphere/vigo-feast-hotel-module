
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)

from app.db.database import Base


class SettlementBatchItem(Base):
    __tablename__ = "vgf_settlement_batch_items"

    __table_args__ = (
        UniqueConstraint(
            "settlement_id",
            name="uq_vgf_settlement_batch_item",
        ),
    )

    batch_item_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    batch_id = Column(
        BigInteger,
        ForeignKey("vgf_settlement_batches.batch_id"),
        nullable=False,
    )

    settlement_id = Column(
        BigInteger,
        ForeignKey("vgf_hotel_settlements.settlement_id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
