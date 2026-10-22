
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Complaint(Base):
    __tablename__ = "vgf_complaints"

    complaint_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id"),
        nullable=False,
    )
    customer_id = Column(
        BigInteger,
        ForeignKey("vgf_customers.customer_id"),
        nullable=False,
    )
    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id"),
        nullable=False,
    )

    category = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="OPEN",
        server_default="OPEN",
    )
    priority = Column(
        String(20),
        nullable=False,
        default="NORMAL",
        server_default="NORMAL",
    )

    resolution_note = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

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
    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    __table_args__ = (
        CheckConstraint(
            "category IN "
            "('MISSING_ITEM', 'WRONG_ITEM', 'FOOD_QUALITY', "
            "'PACKAGING', 'TEMPERATURE', 'OTHER')",
            name="chk_vgf_complaints_category",
        ),
        CheckConstraint(
            "status IN "
            "('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')",
            name="chk_vgf_complaints_status",
        ),
        CheckConstraint(
            "priority IN ('NORMAL', 'HIGH', 'URGENT')",
            name="chk_vgf_complaints_priority",
        ),
        CheckConstraint(
            "LENGTH(TRIM(description)) > 0",
            name="chk_vgf_complaints_description",
        ),
        CheckConstraint(
            "status <> 'RESOLVED' OR resolved_at IS NOT NULL",
            name="chk_vgf_complaints_resolution",
        ),
        Index(
            "idx_vgf_complaints_restaurant_status",
            "restaurant_id",
            "status",
            created_at.desc(),
            postgresql_where=(is_deleted.is_(False)),
        ),
        Index(
            "idx_vgf_complaints_order",
            "order_id",
        ),
        Index(
            "idx_vgf_complaints_customer",
            "customer_id",
        ),
    )


class ComplaintHistory(Base):
    __tablename__ = "vgf_complaint_history"

    history_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    complaint_id = Column(
        BigInteger,
        ForeignKey(
            "vgf_complaints.complaint_id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)

    action = Column(String(30), nullable=False)
    action_note = Column(Text, nullable=True)

    actor_type = Column(String(20), nullable=False)
    actor_id = Column(String(100), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "actor_type IN "
            "('CUSTOMER', 'RESTAURANT_OWNER', 'SUPPORT', 'SYSTEM')",
            name="chk_vgf_complaint_history_actor",
        ),
        Index(
            "idx_vgf_complaint_history_complaint",
            "complaint_id",
            "created_at",
        ),
    )
