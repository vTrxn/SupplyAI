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
    
    if not products:
        raise HTTPException(status_code=404, detail="No hay productos para exportar")

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
    
    if not movements:
        raise HTTPException(status_code=404, detail="No hay movimientos para exportar")

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