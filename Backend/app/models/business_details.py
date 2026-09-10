import uuid

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantBusinessDetails(Base):
    __tablename__ = "nfd_restaurant_business_details"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True
    )

    fssai_license_no = Column(
        String(50),
        nullable=False,
        unique=True
    )

    gst_number = Column(
        String(20),
        nullable=True,
        unique=True
    )

    pan_number = Column(
        String(20),
        nullable=False,
        unique=True
    )

    bank_name = Column(
        String(150),
        nullable=False
    )

    account_number = Column(
        String(50),
        nullable=False
    )

    ifsc_code = Column(
        String(20),
        nullable=False
    )

    upi_id = Column(
        String(100),
        nullable=True
    )