from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class DeliveryPartner(Base):
    __tablename__ = "vgf_delivery_partners"

    partner_id = Column(BigInteger, primary_key=True, autoincrement=True)
    franchisee_id = Column(UUID(as_uuid=True), nullable=True)
    full_name = Column(String(255), nullable=True)
    mobile_number = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    vehicle_type = Column(String(50), nullable=True)
    vehicle_number = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    service_area = Column(String, nullable=True)
    status = Column(String(50), nullable=True)
    verification_status = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
