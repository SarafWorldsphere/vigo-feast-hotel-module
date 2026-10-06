from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    SmallInteger,
    Text,
    Time,
    TIMESTAMP,
    String,
)
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.ext.compiler import compiles

from app.database import Base


@compiles(INET, "sqlite")
def compile_inet_sqlite(type_, compiler, **kw):
    return "VARCHAR(45)"



class CustomerFeedback(Base):
    __tablename__ = "vgf_customer_feedback"

    feedback_id = Column(
        BigInteger,
        primary_key=True,
    )

    order_id = Column(
        BigInteger,
        nullable=False,
    )

    customer_id = Column(
        BigInteger,
        nullable=False,
    )

    rider_id = Column(
        BigInteger,
        nullable=True,
    )

    rating = Column(
        SmallInteger,
        nullable=False,
    )

    comments = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
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
        nullable=False,
    )

    is_deleted = Column(
        Boolean,
        nullable=False,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
    )
