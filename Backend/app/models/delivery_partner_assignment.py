from sqlalchemy import BigInteger, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class DeliveryPartnerAssignment(Base):
    __tablename__ = "vgf_delivery_partner_assignments"

    assignment_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    franchisee_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )

    partner_id = Column(
        BigInteger,
        nullable=False,
    )

    order_id = Column(
        BigInteger,
        nullable=False,
        index=True,
    )

    ordered_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    assigned_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    accepted_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    arrived_at_restaurant = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    picked_up_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    arrived_at_customer = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivered_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    total_delivery_time = Column(
        Integer,
        nullable=True,
    )

    assignment_status = Column(
        String(50),
        nullable=True,
    )

    created_by = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_by = Column(
        String(255),
        nullable=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
