from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.inventory import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderResponse
from app.dependencies import get_token_data
from app.routers.inventory import _ensure_company_and_user

router = APIRouter(prefix="/providers", tags=["Proveedores"])

@router.get("/", response_model=List[ProviderResponse])
async def listar_proveedores(db: AsyncSession = Depends(get_db), token=Depends(get_token_data)):
    await _ensure_company_and_user(db, token)
    result = await db.execute(select(Provider).where(Provider.company_id == token.company_id))
    return result.scalars().all()

@router.post("/", response_model=ProviderResponse, status_code=201)
async def crear_proveedor(data: ProviderCreate, db: AsyncSession = Depends(get_db), token=Depends(get_token_data)):
    await _ensure_company_and_user(db, token)
    provider = Provider(name=data.name, company_id=token.company_id)
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return provider

@router.patch("/{provider_id}", response_model=ProviderResponse)
async def actualizar_proveedor(provider_id: str, data: ProviderUpdate, db: AsyncSession = Depends(get_db), token=Depends(get_token_data)):
    result = await db.execute(select(Provider).where(Provider.id == provider_id, Provider.company_id == token.company_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    if data.name is not None:
        provider.name = data.name
    await db.commit()
    await db.refresh(provider)
    return provider

@router.delete("/{provider_id}", status_code=204)
async def eliminar_proveedor(provider_id: str, db: AsyncSession = Depends(get_db), token=Depends(get_token_data)):
    result = await db.execute(select(Provider).where(Provider.id == provider_id, Provider.company_id == token.company_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(provider)
    await db.commit()
