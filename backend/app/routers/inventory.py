# backend/app/routers/inventory.py
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
import os
import shutil
import uuid

from app.database import get_db
from app.models.inventory import Inventory, InventoryMovement, MovementType, Product
from app.models.user import Company, User
from app.schemas.inventory import (
    MovementCreate, MovementResponse,
    ProductCreate, ProductResponse, ProductUpdate,
)
from app.dependencies import get_token_data

router   = APIRouter(prefix="/inventory", tags=["Inventario"])


async def _ensure_company_and_user(db: AsyncSession, token_data):
    """Crea la empresa y el usuario en la BD local si no existen."""
    company_id = token_data.company_id
    user_id    = token_data.user_id
    email      = token_data.email or f"user_{str(user_id)[:5]}@supplyai.com"

    # 1. Asegurar Empresa
    res = await db.execute(select(Company).where(Company.id == company_id))
    if not res.scalar_one_or_none():
        # Le damos un nombre basado en el email para que se vea más profesional
        db.add(Company(id=company_id, name="Empresa de " + email.split("@")[0]))
        await db.flush()

    # 2. Asegurar Usuario (Para TODOS los usuarios, Supabase o Dev)
    from app.utils.jwt import hash_password
    u_res = await db.execute(select(User).where(User.id == user_id))
    if not u_res.scalar_one_or_none():
        db.add(User(
            id=user_id,
            company_id=company_id,
            email=email,
            hashed_password=hash_password("supabase_auth_bypass"), # La contraseña real la maneja Supabase
            full_name=email.split("@")[0],
            is_active=True,
            is_verified=True
        ))
        await db.flush()


async def _get_stock_map(db: AsyncSession, company_id: str) -> dict:
    result = await db.execute(
        select(Inventory).where(Inventory.company_id == company_id)
    )
    return {inv.product_id: inv.current_stock for inv in result.scalars().all()}


def _product_with_stock(product, stock_map: dict) -> ProductResponse:
    data = ProductResponse.model_validate(product)
    data.current_stock = stock_map.get(str(product.id), 0.0)
    return data


# ── PRODUCTOS ──────────────────────────────────────────────────────────────────

@router.post("/upload-image", status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    await _ensure_company_and_user(db, token)
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Asumimos que el backend y frontend corren en localhost:8000
    # Seria mejor con una variable de entorno, pero por simplicidad retornamos ruta completa
    return {"url": f"http://localhost:8000/uploads/{filename}"}


@router.post("/products", response_model=ProductResponse, status_code=201)
async def crear_producto(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    await _ensure_company_and_user(db, token)

    dup = await db.execute(
        select(Product).where(
            Product.sku == data.sku,
            Product.company_id == token.company_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU ya existe en tu empresa")

    prod_data = data.model_dump(exclude={"stock_inicial"})
    product = Product(**prod_data, company_id=token.company_id)
    db.add(product)
    await db.flush()

    stock_inicial = data.stock_inicial or 0.0
    inventory = Inventory(
        product_id=product.id,
        company_id=token.company_id,
        current_stock=stock_inicial,
    )
    db.add(inventory)

    if stock_inicial > 0:
        ahora = datetime.now(timezone.utc)
        movement = InventoryMovement(
            product_id=product.id,
            company_id=token.company_id,
            user_id=token.user_id,
            type=MovementType.ENTRADA,
            quantity=stock_inicial,
            previous_stock=0.0,
            posterior_stock=stock_inicial,
            reason="Stock inicial al crear producto",
            date=ahora,
        )
        db.add(movement)
        inventory.last_entry = ahora

    await db.commit()
    await db.refresh(product)

    resp = ProductResponse.model_validate(product)
    resp.current_stock = stock_inicial
    return resp


@router.get("/products", response_model=List[ProductResponse])
async def listar_productos(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    await _ensure_company_and_user(db, token)

    query = select(Product).where(Product.company_id == token.company_id)
    if category:
        query = query.where(Product.category == category)

    result   = await db.execute(query)
    products = result.scalars().all()

    stock_map = await _get_stock_map(db, token.company_id)
    return [_product_with_stock(p, stock_map) for p in products]


@router.get("/products/{product_id}", response_model=ProductResponse)
async def obtener_producto(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(
        select(Product).where(
            Product.id         == product_id,
            Product.company_id == token.company_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stock_map = await _get_stock_map(db, token.company_id)
    return _product_with_stock(product, stock_map)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def actualizar_producto(
    product_id: str,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(
        select(Product).where(
            Product.id         == product_id,
            Product.company_id == token.company_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    stock_map = await _get_stock_map(db, token.company_id)
    return _product_with_stock(product, stock_map)


@router.delete("/products/{product_id}", status_code=204)
async def eliminar_producto(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(
        select(Product).where(
            Product.id         == product_id,
            Product.company_id == token.company_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    inv_result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )
    inventory = inv_result.scalar_one_or_none()
    if inventory:
        await db.delete(inventory)

    await db.delete(product)
    await db.commit()


# ── MOVIMIENTOS ────────────────────────────────────────────────────────────────

@router.delete("/movements", status_code=204)
async def limpiar_movimientos(
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    await db.execute(delete(InventoryMovement).where(InventoryMovement.company_id == token.company_id))
    await db.commit()


@router.get("/movements", response_model=List[MovementResponse])
async def todos_movimientos(
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(
        select(InventoryMovement)
        .where(InventoryMovement.company_id == token.company_id)
        .order_by(InventoryMovement.date.desc())
        .limit(500)
    )
    return result.scalars().all()


@router.post("/movements", response_model=MovementResponse, status_code=201)
async def registrar_movimiento(
    data: MovementCreate,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):

    result = await db.execute(
        select(Inventory).where(
            Inventory.product_id == data.product_id,
            Inventory.company_id == token.company_id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Producto no encontrado en inventario")

    stock_anterior = inv.current_stock

    if data.type in (MovementType.ENTRADA, MovementType.AJUSTE):
        inv.current_stock += data.quantity
    elif data.type == MovementType.SALIDA:
        if inv.current_stock < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente. Disponible: {inv.current_stock}",
            )
        inv.current_stock -= data.quantity

    stock_posterior = inv.current_stock
    ahora = datetime.now(timezone.utc)
    inv.updated_at = ahora
    if data.type == MovementType.ENTRADA:
        inv.last_entry = ahora
    elif data.type == MovementType.SALIDA:
        inv.last_exit = ahora

    movement = InventoryMovement(
        product_id=data.product_id,
        company_id=token.company_id,
        user_id=token.user_id,
        type=data.type,
        quantity=data.quantity,
        previous_stock=stock_anterior,
        posterior_stock=stock_posterior,
        reason=data.reason,
        reference=data.reference,
        unit_price=data.unit_price,
        date=data.date or ahora,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


@router.get("/movements/{product_id}", response_model=List[MovementResponse])
async def historial_movimientos(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(
        select(InventoryMovement)
        .where(
            InventoryMovement.product_id == product_id,
            InventoryMovement.company_id == token.company_id,
        )
        .order_by(InventoryMovement.date.desc())
    )
    return result.scalars().all()

@router.delete("/movements/{movement_id}", status_code=204)
async def delete_movement(
    movement_id: str,
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):
    result = await db.execute(select(InventoryMovement).where(InventoryMovement.id == movement_id))
    mov = result.scalar_one_or_none()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    inv_res = await db.execute(
        select(Inventory).where(
            Inventory.product_id == mov.product_id,
            Inventory.company_id == token.company_id
        )
    )
    inv = inv_res.scalar_one_or_none()
    
    if inv:
        if mov.type in (MovementType.ENTRADA, MovementType.AJUSTE):
            inv.current_stock -= mov.quantity
        elif mov.type == MovementType.SALIDA:
            inv.current_stock += mov.quantity

    await db.execute(delete(InventoryMovement).where(InventoryMovement.id == movement_id))
    await db.commit()
    return None