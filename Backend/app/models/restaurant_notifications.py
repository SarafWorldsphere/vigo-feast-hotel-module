
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantNotification(Base):
    __tablename__ = "vgf_restaurant_notifications"

    notification_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id"),
        nullable=False,
    )

    notification_type = Column(
        String(60),
        nullable=False,
    )

    title = Column(
        String(200),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    entity_type = Column(
        String(30),
        nullable=True,
    )

    entity_id = Column(
        BigInteger,
        nullable=True,
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    read_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "entity_type IS NULL OR entity_type IN "
            "('ORDER', 'COMPLAINT', 'REFUND', 'DELIVERY')",
            name="chk_vgf_restaurant_notifications_entity_type",
        ),
        CheckConstraint(
            "is_read = TRUE OR read_at IS NULL",
            name="chk_vgf_restaurant_notifications_read_at",
        ),
        Index(
            "idx_vgf_restaurant_notifications_inbox",
            "restaurant_id",
            created_at.desc(),
        ),
        Index(
            "idx_vgf_restaurant_notifications_unread",
            "restaurant_id",
            created_at.desc(),
            postgresql_where=(is_read.is_(False)),
        ),
    )
