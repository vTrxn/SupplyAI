import io
import pandas as pd
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inventory import Product, Inventory, InventoryMovement, MovementType
from app.utils.jwt import decode_token

router = APIRouter(prefix="/excel", tags=["Excel"])
security = HTTPBearer()

# Mapeo de columnas mostradas en Excel a campos en la base de datos
EXCEL_COLUMNS_MAP = {
    "ID": "sku",
    "Nombre": "name",
    "Categoría": "category",
    "Unidad": "unit",
    "Precio_Costo": "cost_price",
    "Precio_Venta": "sale_price",
    "Estado": "is_active"
}

# ── 1. GENERAR PLANTILLA VACÍA ──────────────────────────────────────────
@router.get("/template")
async def generate_template(
    rows: int = Query(50, ge=1, le=10000, description="Número de filas vacías a generar"),
    cols: Optional[str] = Query(None, description="Columnas separadas por coma, ej. 'ID,Nombre'"),
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    if cols:
        selected_cols = [c.strip() for c in cols.split(",") if c.strip() in EXCEL_COLUMNS_MAP]
    else:
        selected_cols = list(EXCEL_COLUMNS_MAP.keys())
        
    if not selected_cols:
        selected_cols = ["ID", "Nombre", "Categoría", "Precio_Venta", "Estado"]
        
    df = pd.DataFrame(columns=selected_cols, index=range(rows))
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Plantilla_Inventario")
    output.seek(0)
    
    filename = f"plantilla_inventario_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

# ── 2. IMPORTAR DATOS AL SISTEMA ────────────────────────────────────────
@router.post("/import")
async def import_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    if not file.filename.endswith(".xlsx") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Formato inválido. Usa .xlsx o .csv")
        
    try:
        contents = await file.read()
        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo el archivo: {str(e)}")

    if "ID" not in df.columns and "sku" not in df.columns:
        raise HTTPException(status_code=400, detail="El archivo debe contener la columna 'ID' o 'sku'")
        
    id_col = "ID" if "ID" in df.columns else "sku"
    df = df.dropna(subset=[id_col])
    
    stats = {"creados": 0, "actualizados": 0, "errores": 0}
    ahora = datetime.now(timezone.utc)
    
    for index, row in df.iterrows():
        try:
            sku_val = str(row[id_col]).strip()
            if not sku_val or sku_val == "nan": continue
            
            res = await db.execute(select(Product).where(Product.sku == sku_val, Product.company_id == token.company_id))
            producto = res.scalar_one_or_none()
            
            es_nuevo = False
            if not producto:
                producto = Product(sku=sku_val, company_id=token.company_id, name="Nuevo Producto", unit="unidad")
                db.add(producto)
                es_nuevo = True
                await db.flush() 
                
            for excel_col, val in row.items():
                if pd.isna(val): continue
                if excel_col in EXCEL_COLUMNS_MAP:
                    db_field = EXCEL_COLUMNS_MAP[excel_col]
                    
                    if hasattr(producto, db_field) and db_field != "sku":
                        if db_field == "is_active":
                            setattr(producto, db_field, str(val).lower() in ["activo", "true", "1", "sí", "si"])
                        elif type(getattr(Product, db_field).type).__name__ == 'Float':
                            setattr(producto, db_field, float(val))
                        else:
                            setattr(producto, db_field, str(val))

            inv_res = await db.execute(select(Inventory).where(Inventory.product_id == producto.id))
            inventory = inv_res.scalar_one_or_none()
            
            if not inventory:
                inventory = Inventory(product_id=producto.id, company_id=token.company_id, current_stock=0.0)
                db.add(inventory)
                await db.flush()

            if es_nuevo:
                stats["creados"] += 1
            else:
                stats["actualizados"] += 1
                
        except Exception as e:
            print(f"Error procesando fila {index}: {e}")
            stats["errores"] += 1
            
    await db.commit()
    return {"message": "Importación completada", "stats": stats}

# ── 3. EXPORTAR DATOS ACTUALES A EXCEL ──────────────────────────────────
@router.get("/export")
async def export_excel(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    # Obtener productos
    query = select(Product).where(Product.company_id == token.company_id)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # if not products:
    #     raise HTTPException(status_code=404, detail="No hay productos para exportar")

    # Armar los datos basados en el MAP original
    data = []
    for p in products:
        data.append({
            "ID": p.sku,
            "Nombre": p.name,
            "Categoría": p.category or "",
            "Unidad": p.unit,
            "Precio_Costo": p.cost_price,
            "Precio_Venta": p.sale_price,
            "Estado": "Activo" if p.is_active else "Inactivo"
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Inventario_SupplyAI')
    
    output.seek(0)
    filename = f"Inventario_Actual_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

# ── 4. EXPORTAR HISTORIAL DE MOVIMIENTOS A EXCEL ────────────────────────
@router.get("/export-movements")
async def export_movements(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    from sqlalchemy.orm import joinedload
    query = select(InventoryMovement).options(joinedload(InventoryMovement.product)).where(InventoryMovement.company_id == token.company_id).order_by(InventoryMovement.date.desc())
    result = await db.execute(query)
    movements = result.scalars().all()
    
    # if not movements:
    #     raise HTTPException(status_code=404, detail="No hay movimientos para exportar")

    data = []
    for m in movements:
        data.append({
            "Fecha": m.date.strftime("%Y-%m-%d %H:%M:%S") if m.date else "",
            "Tipo": m.type.value if hasattr(m.type, "value") else str(m.type),
            "Producto_SKU": m.product.sku if m.product else m.product_id,
            "Producto_Nombre": m.product.name if m.product else "Desconocido",
            "Cantidad": m.quantity,
            "Stock_Anterior": m.previous_stock,
            "Stock_Posterior": m.posterior_stock,
            "Motivo": m.reason or ""
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Historial_Movimientos')
    
    output.seek(0)
    filename = f"Historial_Movimientos_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
# ── 5. EXPORTAR PARA POSTGRES (SQL) ──────────────────────────────────
@router.get("/export/sql")
async def export_sql(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    query = select(Product).where(Product.company_id == token.company_id)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # if not products:
    #     raise HTTPException(status_code=404, detail="No hay productos para exportar")

    sql_statements = [
        "-- Exportación de Inventario SupplyAI para PostgreSQL\n",
        "CREATE TABLE IF NOT EXISTS inventory_import (\n",
        "    sku VARCHAR(50),\n",
        "    name VARCHAR(200),\n",
        "    category VARCHAR(100),\n",
        "    cost_price NUMERIC,\n",
        "    sale_price NUMERIC,\n",
        "    is_active BOOLEAN\n",
        ");\n\n"
    ]

    for p in products:
        active_val = "TRUE" if p.is_active else "FALSE"
        stmt = f"INSERT INTO inventory_import (sku, name, category, cost_price, sale_price, is_active) VALUES ('{p.sku}', '{p.name}', '{p.category or ''}', {p.cost_price}, {p.sale_price}, {active_val});\n"
        sql_statements.append(stmt)

    output = io.BytesIO("".join(sql_statements).encode("utf-8"))
    filename = f"SupplyAI_Postgres_{datetime.now().strftime('%Y%m%d_%H%M')}.sql"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(output, media_type="text/plain", headers=headers)

# ── 6. EXPORTAR PARA SAP (CSV Específico) ──────────────────────────────
@router.get("/export/sap")
async def export_sap(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    query = select(Product).where(Product.company_id == token.company_id)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # if not products:
    #     raise HTTPException(status_code=404, detail="No hay productos para exportar")

    # SAP a menudo requiere formatos específicos, aquí simulamos uno común (ItemCode, ItemName, UoM, etc)
    data = []
    for p in products:
        data.append({
            "ItemCode": p.sku,
            "ItemName": p.name,
            "ForeignName": "",
            "ItemsGroupCode": p.category or "100",
            "SalesUnit": p.unit,
            "InBaseUnit": "Y",
            "InventoryItem": "Y",
            "SalesItem": "Y",
            "PurchaseItem": "Y"
        })

    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False, sep=';') # SAP a veces prefiere punto y coma
    
    stream = io.BytesIO(output.getvalue().encode("utf-8"))
    filename = f"SAP_Import_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(stream, media_type="text/csv", headers=headers)

# ── 7. EXPORTAR PARA SHOPIFY (CSV de Productos) ───────────────────────
@router.get("/export/shopify")
async def export_shopify(
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security)
):
    token = decode_token(credentials.credentials)
    
    query = select(Product).where(Product.company_id == token.company_id)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # if not products:
    #     raise HTTPException(status_code=404, detail="No hay productos para exportar")

    # Shopify Product CSV headers
    data = []
    for p in products:
        data.append({
            "Handle": p.name.lower().replace(" ", "-"),
            "Title": p.name,
            "Body (HTML)": p.description or "",
            "Vendor": "SupplyAI",
            "Type": p.category or "",
            "Tags": "",
            "Published": "true",
            "Option1 Name": "Title",
            "Option1 Value": "Default Title",
            "Variant SKU": p.sku,
            "Variant Inventory Tracker": "shopify",
            "Variant Inventory Qty": 0, # Se podría cruzar con la tabla Inventory si es necesario
            "Variant Price": p.sale_price,
            "Variant Requires Shipping": "true",
            "Variant Taxable": "true",
            "Variant Barcode": ""
        })

    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    
    stream = io.BytesIO(output.getvalue().encode("utf-8"))
    filename = f"Shopify_Products_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    
    return StreamingResponse(stream, media_type="text/csv", headers=headers)
