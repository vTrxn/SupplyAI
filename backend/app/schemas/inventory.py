# backend/app/schemas/inventory.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.inventory import MovementType


class ProductCreate(BaseModel):
    sku:           str
    name:          str
    description:   Optional[str]  = None
    category:      Optional[str]  = None
    unit:          str             = "unidad"
    cost_price:    float           = 0.0
    sale_price:    float           = 0.0
    min_stock:     float           = 0.0
    max_stock:     float           = 0.0
    reorder_point: float           = 0.0
    stock_inicial: float           = 0.0   # si > 0 crea movimiento de entrada automático
    image_url:     Optional[str]   = None  # URL externa de la imagen del producto
    provider_id:   Optional[str]   = None


class ProductUpdate(BaseModel):
    name:          Optional[str]   = None
    description:   Optional[str]   = None
    category:      Optional[str]   = None
    unit:          Optional[str]   = None
    cost_price:    Optional[float] = None
    sale_price:    Optional[float] = None
    min_stock:     Optional[float] = None
    max_stock:     Optional[float] = None
    reorder_point: Optional[float] = None
    is_active:     Optional[bool]  = None
    image_url:     Optional[str]   = None
    provider_id:   Optional[str]   = None


class ProductResponse(BaseModel):
    id:            str
    sku:           str
    name:          str
    description:   Optional[str]  = None
    category:      Optional[str]  = None
    unit:          str
    cost_price:    float
    sale_price:    float
    min_stock:     float
    max_stock:     float
    reorder_point: float
    is_active:     bool
    company_id:    str
    created_at:    datetime
    current_stock: float = 0.0
    image_url:     Optional[str]  = None
    provider_id:   Optional[str]  = None
    model_config = {"from_attributes": True}


class MovementCreate(BaseModel):
    product_id:  str
    type:        MovementType
    quantity:    float
    reason:      Optional[str]      = None
    reference:   Optional[str]      = None
    unit_price:  Optional[float]    = None
    date:        Optional[datetime] = None


class MovementResponse(BaseModel):
    id:              str
    product_id:      str
    type:            MovementType
    quantity:        float
    previous_stock:  Optional[float]   = None
    posterior_stock: Optional[float]   = None
    reason:          Optional[str]     = None
    reference:       Optional[str]     = None
    date:            datetime
    model_config = {"from_attributes": True}