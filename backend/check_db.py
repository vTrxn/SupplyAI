import asyncio
from app.database import engine
from sqlalchemy import select
from app.models.inventory import Product

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(select(Product))
        rows = res.all()
        print(f"Products total: {len(rows)}")
        for r in rows:
            # En SQLAlchemy async, r suele ser un Row objeto, podemos acceder por nombre
            print(f" - SKU: {r[2]}, Company: {r[1]}") # Basado en el modelo: id, company_id, sku...

if __name__ == "__main__":
    asyncio.run(check())
