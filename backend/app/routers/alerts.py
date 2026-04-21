# backend/app/routers/alerts.py
from typing import List
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inventory import Inventory, Product
from app.utils.jwt import decode_token

router = APIRouter(prefix="/alerts", tags=["Alertas"])
security = HTTPBearer()


@router.get("")
async def obtener_alertas(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security),
):
    token = decode_token(credentials.credentials)

    result = await db.execute(
        select(Product, Inventory)
        .join(Inventory, Product.id == Inventory.product_id, isouter=True)
        .where(Product.company_id == token.company_id, Product.is_active == True)
    )

    alertas = []
    for product, inv in result.all():
        stock = inv.current_stock if inv else 0.0

        if stock == 0:
            alertas.append({
                "product_id":    str(product.id),
                "product_name":  product.name,
                "sku":           product.sku,
                "type":          "sin_stock",
                "severity":      "critical",
                "message":       f"{product.name} está completamente agotado.",
                "current_stock": stock,
                "threshold":     product.min_stock,
            })
        elif product.min_stock > 0 and stock <= product.min_stock:
            alertas.append({
                "product_id":    str(product.id),
                "product_name":  product.name,
                "sku":           product.sku,
                "type":          "bajo_minimo",
                "severity":      "critical",
                "message":       f"{product.name} está bajo el mínimo ({stock:.0f} ≤ {product.min_stock:.0f}).",
                "current_stock": stock,
                "threshold":     product.min_stock,
            })
        elif product.reorder_point > 0 and stock <= product.reorder_point:
            alertas.append({
                "product_id":    str(product.id),
                "product_name":  product.name,
                "sku":           product.sku,
                "type":          "reorden",
                "severity":      "warning",
                "message":       f"{product.name} alcanzó el punto de reorden ({stock:.0f} ≤ {product.reorder_point:.0f}).",
                "current_stock": stock,
                "threshold":     product.reorder_point,
            })

    return alertas
