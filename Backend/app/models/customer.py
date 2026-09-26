from sqlalchemy import BigInteger, Boolean, Column, DateTime, String
from app.db.database import Base


class Customer(Base):
    __tablename__ = "vgf_customers"

    customer_id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    mobile = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    default_address_id = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)


class CustomerAddress(Base):
    __tablename__ = "vgf_customer_addresses"

    address_id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, nullable=False)
    address_text = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
