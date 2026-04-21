# backend/app/models/inventory.py
"""
Modelos de base de datos para el modulo de inventario SupplyAI.
Tablas: products, inventory, inventory_movements
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Float, DateTime,
    ForeignKey, Enum as SAEnum, Text, Boolean
)
from sqlalchemy.orm import relationship

from app.database import Base


class MovementType(str, PyEnum):
    """Tipos de movimiento de inventario"""
    ENTRADA  = "entrada"
    SALIDA   = "salida"
    AJUSTE   = "ajuste"
    TRASLADO = "traslado"


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    sku           = Column(String(50),  nullable=False, index=True)
    name          = Column(String(200), nullable=False)
    image_url     = Column(String(500), nullable=True)   # URL externa de imagen del producto
    description   = Column(Text,        nullable=True)
    category      = Column(String(100), nullable=True, index=True)
    unit          = Column(String(30),  default="unidad")

    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)

    min_stock      = Column(Float, default=0.0)
    max_stock      = Column(Float, default=0.0)
    reorder_point  = Column(Float, default=0.0)

    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    company   = relationship("Company",           back_populates="products")
    inventory = relationship("Inventory",         back_populates="product", uselist=False)
    movements = relationship("InventoryMovement", back_populates="product")

    def __repr__(self):
        return f"<Product {self.sku} - {self.name}>"


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    product_id = Column(String(36), ForeignKey("products.id",  ondelete="CASCADE"), nullable=False, unique=True)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    current_stock = Column(Float, default=0.0)
    location      = Column(String(100), nullable=True)

    last_entry = Column(DateTime(timezone=True), nullable=True)
    last_exit  = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="inventory")
    company = relationship("Company", back_populates="inventories")

    def __repr__(self):
        return f"<Inventory product_id={self.product_id} stock={self.current_stock}>"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    product_id = Column(String(36), ForeignKey("products.id",  ondelete="CASCADE"), nullable=False)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(String(36), ForeignKey("users.id",     ondelete="SET NULL"), nullable=True)

    type            = Column(SAEnum(MovementType), nullable=False)
    quantity        = Column(Float, nullable=False)
    previous_stock  = Column(Float, nullable=True)
    posterior_stock = Column(Float, nullable=True)

    reason     = Column(String(200), nullable=True)
    reference  = Column(String(100), nullable=True)
    unit_price = Column(Float,       nullable=True)

    date       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="movements")
    company = relationship("Company", back_populates="movements")
    user    = relationship("User",    back_populates="movements")

    def __repr__(self):
        return f"<Movement {self.type} qty={self.quantity} product_id={self.product_id}>"