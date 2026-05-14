# backend/app/routers/forecast.py
from typing import List
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inventory import Inventory, Product
from app.dependencies import get_token_data

router = APIRouter(prefix="/forecast", tags=["Forecast IA"])


@router.get("")
async def obtener_forecast(
    db: AsyncSession = Depends(get_db),
    token=Depends(get_token_data),
):

    result = await db.execute(
        select(Product, Inventory)
        .join(Inventory, Product.id == Inventory.product_id, isouter=True)
        .where(Product.company_id == token.company_id, Product.is_active == True)
    )

    forecasts = []
    for product, inv in result.all():
        stock = inv.current_stock if inv else 0.0
        daily_rate = product.min_stock / 30 if product.min_stock > 0 else 1.0
        days_left = int(stock / daily_rate) if daily_rate > 0 else 999
        urgency = "critical" if days_left <= 7 else "warning" if days_left <= 15 else "ok"
        reorder_qty = max(0, product.max_stock - stock)

        forecasts.append({
            "product_id":    str(product.id),
            "product_name":  product.name,
            "sku":           product.sku,
            "current_stock": stock,
            "daily_rate":    round(daily_rate, 2),
            "days_left":     days_left,
            "urgency":       urgency,
            "reorder_qty":   reorder_qty,
            "reorder_cost":  reorder_qty * product.cost_price,
        })

    forecasts.sort(key=lambda x: x["days_left"])
    return forecasts
