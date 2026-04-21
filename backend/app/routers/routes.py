# backend/app/routers/routes.py
"""
Endpoints de optimización de rutas para SupplyAI.

POST /routes/planificar  → planifica y optimiza una ruta completa
POST /routes/geocodificar → convierte dirección a coordenadas
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional
from app.utils.jwt import decode_token
from app.services.routes_service import planificar_ruta, geocodificar_direccion

router   = APIRouter(prefix="/routes", tags=["Rutas"])
security = HTTPBearer()


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
async def planificar(body: PlanificarRequest, credentials=Depends(security)):
    """
    Planifica y optimiza una ruta completa.
    - Geocodifica direcciones automáticamente
    - Optimiza el orden de paradas (TSP greedy)
    - Calcula ruta real por calles de Bogotá via OSRM
    """
    decode_token(credentials.credentials)

    if not body.paradas:
        raise HTTPException(status_code=400, detail="Debes agregar al menos una parada")
    if len(body.paradas) > 15:
        raise HTTPException(status_code=400, detail="Máximo 15 paradas por ruta en el MVP")

    origen_dict  = body.origen.model_dump()
    paradas_dict = [p.model_dump() for p in body.paradas]

    resultado = await planificar_ruta(origen_dict, paradas_dict, body.tipo)
    return resultado


@router.post("/geocodificar")
async def geocodificar(body: GeocodeRequest, credentials=Depends(security)):
    """Convierte una dirección de Bogotá a coordenadas lat/lng."""
    decode_token(credentials.credentials)
    coords = await geocodificar_direccion(body.direccion)
    if not coords:
        raise HTTPException(status_code=404, detail=f"No se encontró la dirección: {body.direccion}")
    return coords