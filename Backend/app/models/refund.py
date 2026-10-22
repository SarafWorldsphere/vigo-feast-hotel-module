
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class Refund(Base):
    __tablename__ = "vgf_refunds"

    refund_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id"),
        nullable=False,
        index=True,
    )

    complaint_id = Column(
        BigInteger,
        ForeignKey("vgf_complaints.complaint_id"),
        nullable=True,
    )

    initiated_by_owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurant_owners.id"),
        nullable=True,
    )

    amount = Column(Numeric(10, 2), nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    reason = Column(String(255), nullable=True)

    destination_method = Column(String(30), nullable=True)

    execution_reference = Column(String(255), nullable=True)

    failure_reason = Column(Text, nullable=True)

    idempotency_key = Column(
        UUID(as_uuid=True),
        nullable=True,
        default=uuid.uuid4,
    )

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

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    order = relationship("Order", back_populates="refunds")

    complaint = relationship("Complaint")

    initiated_by_owner = relationship("RestaurantOwner")

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="chk_vgf_refunds_amount",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="chk_vgf_refunds_status",
        ),
        CheckConstraint(
            "destination_method IS NULL OR destination_method IN "
            "('ORIGINAL_PAYMENT_METHOD', 'UPI', 'BANK_ACCOUNT')",
            name="chk_vgf_refunds_destination",
        ),
        Index(
            "uq_vgf_refunds_complaint_id",
            "complaint_id",
            unique=True,
            postgresql_where=(complaint_id.is_not(None)),
        ),
        Index(
            "uq_vgf_refunds_idempotency_key",
            "idempotency_key",
            unique=True,
            postgresql_where=(idempotency_key.is_not(None)),
        ),
    )
