import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Boolean, DateTime,
    ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, PyEnum):
    admin    = "admin"
    operator = "operator"
    viewer   = "viewer"


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name       = Column(String(200), nullable=False)
    nit        = Column(String(20),  unique=True, nullable=True)
    industry   = Column(String(100), nullable=True)
    city       = Column(String(100), default="Bogotá")
    address    = Column(Text,        nullable=True)
    is_active  = Column(Boolean,     default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    users       = relationship("User",              back_populates="company", lazy="selectin")
    products    = relationship("Product",           back_populates="company", lazy="selectin")
    inventories = relationship("Inventory",         back_populates="company", lazy="selectin")
    movements   = relationship("InventoryMovement", back_populates="company", lazy="selectin")

    def __repr__(self):
        return f"<Company id={self.id} name={self.name}>"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id      = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    email           = Column(String(254), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(200), nullable=True)
    role            = Column(Enum(UserRole), default=UserRole.operator, nullable=False)
    is_active       = Column(Boolean, default=True,  nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    last_login      = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    company   = relationship("Company", back_populates="users")
    movements = relationship("InventoryMovement", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"