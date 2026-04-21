# backend/app/services/routes_service.py
"""
Servicio de optimización de rutas para SupplyAI.

Stack:
  - OSRM API pública: calcula distancias/tiempos reales por calles de Bogotá
  - Algoritmo greedy nearest-neighbor: optimiza orden de paradas (TSP)
  - Nominatim (OpenStreetMap): geocodificación de direcciones a coordenadas

Sin dependencias de pago. Todo gratuito.
"""

import asyncio
import httpx
from typing import Optional

# APIs públicas gratuitas
OSRM_BASE    = "https://router.project-osrm.org"
NOMINATIM    = "https://nominatim.openstreetmap.org"
HEADERS      = {"User-Agent": "SupplyAI/1.0 (supply chain optimizer Bogota)"}

# Centro de Bogotá como fallback
BOGOTA_LAT = 4.7110
BOGOTA_LNG = -74.0721


async def geocodificar_direccion(direccion: str) -> Optional[dict]:
    """
    Convierte una dirección de Bogotá a coordenadas lat/lng.
    Agrega 'Bogotá Colombia' si no está en la dirección.
    """
    query = direccion if "bogot" in direccion.lower() else f"{direccion}, Bogotá, Colombia"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.get(
                f"{NOMINATIM}/search",
                params={"q": query, "format": "json", "limit": 1, "countrycodes": "co"},
                headers=HEADERS,
            )
            data = res.json()
            if data:
                return {
                    "lat": float(data[0]["lat"]),
                    "lng": float(data[0]["lon"]),
                    "display": data[0].get("display_name", direccion),
                }
        except Exception:
            pass
    return None


async def obtener_matriz_distancias(puntos: list[dict]) -> dict:
    """
    Obtiene matriz de duraciones y distancias entre todos los puntos via OSRM.
    puntos: lista de {"lat": float, "lng": float}
    Retorna: {"duraciones": matrix NxN en segundos, "distancias": matrix NxN en metros}
    """
    coords = ";".join(f"{p['lng']},{p['lat']}" for p in puntos)
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            res = await client.get(
                f"{OSRM_BASE}/table/v1/driving/{coords}",
                params={"annotations": "duration,distance"},
                headers=HEADERS,
            )
            data = res.json()
            if data.get("code") == "Ok":
                return {
                    "duraciones": data.get("durations", []),
                    "distancias": data.get("distances", []),
                }
        except Exception as e:
            pass
    return {"duraciones": [], "distancias": []}


async def calcular_ruta_osrm(puntos: list[dict]) -> dict:
    """
    Calcula la ruta completa entre puntos en orden via OSRM.
    Retorna: geometría de la ruta + pasos de navegación + distancia + duración.
    """
    coords = ";".join(f"{p['lng']},{p['lat']}" for p in puntos)
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            res = await client.get(
                f"{OSRM_BASE}/route/v1/driving/{coords}",
                params={
                    "overview":     "full",
                    "geometries":   "geojson",
                    "steps":        "true",
                    "annotations":  "false",
                },
                headers=HEADERS,
            )
            data = res.json()
            if data.get("code") == "Ok" and data.get("routes"):
                ruta = data["routes"][0]
                return {
                    "geometria":   ruta["geometry"]["coordinates"],  # [[lng,lat], ...]
                    "distancia_m": ruta["distance"],
                    "duracion_s":  ruta["duration"],
                    "pasos":       _extraer_pasos(ruta),
                }
        except Exception as e:
            pass
    return {"geometria": [], "distancia_m": 0, "duracion_s": 0, "pasos": []}


def _extraer_pasos(ruta: dict) -> list[dict]:
    """Extrae pasos de navegación legibles."""
    pasos = []
    for leg in ruta.get("legs", []):
        for step in leg.get("steps", []):
            maneuver = step.get("maneuver", {})
            tipo = maneuver.get("type", "")
            mod  = maneuver.get("modifier", "")
            dist = step.get("distance", 0)
            nombre = step.get("name", "")
            if dist < 10:
                continue
            if tipo == "depart":
                instruccion = f"Salir por {nombre}" if nombre else "Iniciar ruta"
            elif tipo == "arrive":
                instruccion = "Llegaste al destino"
            elif tipo == "turn":
                dirs = {"left":"izquierda","right":"derecha","straight":"recto","slight left":"leve izquierda","slight right":"leve derecha","sharp left":"giro fuerte izquierda","sharp right":"giro fuerte derecha"}
                instruccion = f"Girar {dirs.get(mod, mod)} en {nombre}" if nombre else f"Girar {dirs.get(mod, mod)}"
            else:
                instruccion = f"Continuar por {nombre}" if nombre else "Continuar"
            pasos.append({
                "instruccion": instruccion,
                "distancia_m": round(dist),
                "duracion_s":  round(step.get("duration", 0)),
            })
    return pasos[:20]  # máx 20 pasos


def optimizar_orden_paradas(origen: dict, paradas: list[dict], matriz: dict) -> list[int]:
    """
    Algoritmo Nearest Neighbor (greedy) para TSP.
    Retorna lista de índices en el orden óptimo.
    El origen es el índice 0 en la matriz.

    Para MVPs con <15 paradas este algoritmo da resultados muy buenos
    y es instantáneo (no necesita OR-Tools como dependencia).
    """
    duraciones = matriz.get("duraciones", [])
    n = len(paradas) + 1  # +1 por el origen

    if not duraciones or len(duraciones) < n:
        return list(range(len(paradas)))

    visitados = {0}
    orden = []
    actual = 0

    while len(visitados) < n:
        mejor_tiempo = float("inf")
        mejor_idx    = -1
        for j in range(1, n):
            if j not in visitados:
                t = duraciones[actual][j] if actual < len(duraciones) and j < len(duraciones[actual]) else float("inf")
                if t < mejor_tiempo:
                    mejor_tiempo = t
                    mejor_idx    = j
        if mejor_idx == -1:
            break
        visitados.add(mejor_idx)
        orden.append(mejor_idx - 1)  # -1 para índice de paradas (sin origen)
        actual = mejor_idx

    # Agregar cualquier parada no visitada al final
    for i in range(len(paradas)):
        if i not in orden:
            orden.append(i)

    return orden


async def planificar_ruta(
    origen: dict,
    paradas: list[dict],
    tipo: str = "entrega",
) -> dict:
    """
    Función principal: geocodifica, optimiza y calcula ruta completa.

    Args:
        origen:  {"nombre": str, "direccion": str, "lat": float|None, "lng": float|None}
        paradas: lista de {"nombre": str, "direccion": str, "lat": float|None, "lng": float|None}
        tipo:    "entrega" | "reabastecimiento"

    Returns:
        dict con ruta optimizada, geometría, estadísticas y pasos
    """
    # 1. Geocodificar puntos sin coordenadas
    todos = [origen] + paradas
    for punto in todos:
        if not punto.get("lat") or not punto.get("lng"):
            coords = await geocodificar_direccion(punto.get("direccion", "Bogotá"))
            if coords:
                punto["lat"] = coords["lat"]
                punto["lng"] = coords["lng"]
                punto["direccion_completa"] = coords["display"]
            else:
                # Fallback: coordenadas de Bogotá centro con pequeño offset
                punto["lat"] = BOGOTA_LAT + (hash(punto.get("nombre","")) % 100) * 0.001
                punto["lng"] = BOGOTA_LNG + (hash(punto.get("direccion","")) % 100) * 0.001

    # 2. Obtener matriz de distancias
    puntos_coords = [{"lat": p["lat"], "lng": p["lng"]} for p in todos]
    matriz = await obtener_matriz_distancias(puntos_coords)

    # 3. Optimizar orden de paradas
    if len(paradas) > 1 and matriz["duraciones"]:
        orden_optimo = optimizar_orden_paradas(origen, paradas, matriz)
        paradas_ordenadas = [paradas[i] for i in orden_optimo]
    else:
        paradas_ordenadas = paradas
        orden_optimo = list(range(len(paradas)))

    # 4. Calcular ruta con OSRM en el orden optimizado
    puntos_ruta = [origen] + paradas_ordenadas
    ruta_osrm = await calcular_ruta_osrm(
        [{"lat": p["lat"], "lng": p["lng"]} for p in puntos_ruta]
    )

    # 5. Calcular estadísticas
    distancia_km  = round(ruta_osrm["distancia_m"] / 1000, 1)
    duracion_min  = round(ruta_osrm["duracion_s"]  / 60)
    duracion_str  = f"{duracion_min // 60}h {duracion_min % 60}min" if duracion_min >= 60 else f"{duracion_min} min"

    # Estimado de combustible (consumo promedio ciudad Bogotá: 10L/100km)
    combustible_l = round(distancia_km * 0.10, 1)

    return {
        "tipo":          tipo,
        "origen":        origen,
        "paradas":       paradas_ordenadas,
        "orden_original": orden_optimo,
        "geometria":     ruta_osrm["geometria"],  # [[lng,lat], ...]
        "pasos":         ruta_osrm["pasos"],
        "estadisticas": {
            "distancia_km":  distancia_km,
            "duracion_min":  duracion_min,
            "duracion_str":  duracion_str,
            "num_paradas":   len(paradas),
            "combustible_l": combustible_l,
        },
        "optimizado": len(paradas) > 1,
    }