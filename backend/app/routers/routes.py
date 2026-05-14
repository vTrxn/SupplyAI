# backend/app/routers/routes.py
"""
Endpoints de optimización de rutas para SupplyAI.

POST /routes/planificar  → planifica y optimiza una ruta completa
POST /routes/geocodificar → convierte dirección a coordenadas
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_token_data
from app.services.routes_service import planificar_ruta, geocodificar_direccion

router   = APIRouter(prefix="/routes", tags=["Rutas"])


class PuntoRuta(BaseModel):
    nombre:    str
    direccion: str
    lat:       Optional[float] = None
    lng:       Optional[float] = None
    notas:     Optional[str]   = None  # ej: "entregar 50 cajas de arroz"


class PlanificarRequest(BaseModel):
    origen:   PuntoRuta
    paradas:  list[PuntoRuta]
    tipo:     str = "entrega"  # "entrega" | "reabastecimiento"


class GeocodeRequest(BaseModel):
    direccion: str


@router.post("/planificar")
async def planificar(body: PlanificarRequest, token=Depends(get_token_data)):

    if not body.paradas:
        raise HTTPException(status_code=400, detail="Debes agregar al menos una parada")
    if len(body.paradas) > 15:
        raise HTTPException(status_code=400, detail="Máximo 15 paradas por ruta en el MVP")

    origen_dict  = body.origen.model_dump()
    paradas_dict = [p.model_dump() for p in body.paradas]

    resultado = await planificar_ruta(origen_dict, paradas_dict, body.tipo)
    return resultado


@router.post("/geocodificar")
async def geocodificar(body: GeocodeRequest, token=Depends(get_token_data)):
    """Convierte una dirección de Bogotá a coordenadas lat/lng."""
    coords = await geocodificar_direccion(body.direccion)
    if not coords:
        raise HTTPException(status_code=404, detail=f"No se encontró la dirección: {body.direccion}")
    return coords
