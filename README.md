 
# SupplyAI 

> Plataforma web IA-driven para optimizar cadenas de suministro en PYMES de Bogotá/Colombia.
> **Objetivo:** Reducir costos logísticos 20–30% mediante forecasting de demanda, alertas predictivas, optimización de rutas y chatbot IA.

---

## ¿Qué hace SupplyAI?

| Feature | Descripción |
|---|---|
|  **Inventario en tiempo real** | Tracking con alertas visuales (rojo/amarillo/verde) |
|  **Forecasting IA** | Predicción demanda con Prophet + XGBoost + IPC DANE |
|  **Alertas predictivas** | "Stockout probable en 5 días para Producto X" |
|  **Rutas optimizadas** | OR-Tools + Google Maps para entregas en Bogotá |
|  **Chatbot IA** | Consultas en lenguaje natural sobre tu inventario |

---

## Stack Tecnológico

**Backend:** Python 3.11 + FastAPI + SQLAlchemy (async)  
**Frontend:** React 18 + Vite + TypeScript + Tailwind CSS  
**Base de datos:** SQLite (desarrollo) → PostgreSQL (producción)  
**ML/IA:** Prophet, XGBoost, scikit-learn, LangChain + Groq  
**Rutas:** OR-Tools + Google Maps Routes API  

---

## Prerrequisitos

Asegúrate de tener instalado:

- **Python 3.11+** → [python.org](https://www.python.org/downloads/)
- **Node.js 20+** → [nodejs.org](https://nodejs.org/)
- **Git** → [git-scm.com](https://git-scm.com/)

Verifica tus versiones:
```bash
python --version   # debe ser 3.11+
node --version     # debe ser 20+
git --version
```

---

## Instalación y Setup

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/supplyai.git
cd supplyai
```

### 2. Configurar variables de entorno

```bash
# Copia el template y edita con tus valores
cp .env.example .env
```

Abre `.env` y completa al menos:
```
SECRET_KEY=una-clave-secreta-larga-aqui
DATABASE_URL=sqlite+aiosqlite:///./supplyai_dev.db
```
Las demás variables (Google Maps, Groq, etc.) son opcionales para el MVP básico.

### 3. Setup del Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En macOS/Linux:
source venv/bin/activate
# En Windows:
venv\Scripts\activate

# Verificar que estás en el entorno virtual (debe mostrar (venv))
which python  # macOS/Linux
# o: where python  # Windows

# Instalar dependencias
pip install -r requirements.txt
```

> ⏱️ **Nota:** La primera instalación puede tardar 3–5 minutos porque Prophet y XGBoost son paquetes pesados.

### 4. Inicializar la base de datos

```bash
# Desde la carpeta backend/ con el venv activado:
python -m app.database  # Crea las tablas en SQLite
```

### 5. Correr el Backend

```bash
# Desde la carpeta backend/ con el venv activado:
uvicorn app.main:app --reload --port 8000
```

El backend estará disponible en:
- **API:** http://localhost:8000
- **Documentación interactiva (Swagger):** http://localhost:8000/docs
- **Documentación alternativa (Redoc):** http://localhost:8000/redoc

### 6. Setup del Frontend

```bash
# En otra terminal, desde la raíz del proyecto:
cd frontend

# Instalar dependencias Node
npm install

# Correr en modo desarrollo
npm run dev
```

El frontend estará disponible en: **http://localhost:5173**

---

## Estructura del Proyecto

```
supplyai/
├── .gitignore
├── .env.example          ← Template de variables de entorno
├── README.md             ← Este archivo
│
├── backend/
│   ├── app/
│   │   ├── main.py               ← Entry point FastAPI
│   │   ├── config.py             ← Settings con Pydantic BaseSettings
│   │   ├── database.py           ← SQLAlchemy async engine
│   │   ├── api/v1/               ← Routers: auth, inventory, forecasting...
│   │   ├── models/               ← Modelos SQLAlchemy (tablas DB)
│   │   ├── schemas/              ← Schemas Pydantic (request/response)
│   │   ├── services/             ← Lógica de negocio
│   │   └── ml/                   ← Módulos IA/ML (core del proyecto)
│   │       ├── forecasting/      ← Prophet + XGBoost + DANE
│   │       ├── anomaly/          ← Isolation Forest
│   │       ├── routing/          ← OR-Tools + Google Maps
│   │       └── chatbot/          ← LangChain + Groq
│   ├── tests/                    ← Tests pytest
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/                ← Dashboard, Inventory, Forecasting...
│   │   ├── components/           ← Componentes reutilizables
│   │   ├── hooks/                ← Custom React hooks
│   │   ├── api/                  ← Axios clients
│   │   ├── store/                ← Estado global (Zustand)
│   │   └── types/                ← TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    └── PROJECT_SPEC.md           ← Especificación completa del proyecto
```

---

## Comandos Útiles

### Backend

```bash
# Correr tests
cd backend && pytest tests/ -v

# Correr con hot-reload (desarrollo)
uvicorn app.main:app --reload --port 8000

# Ver logs detallados
uvicorn app.main:app --reload --log-level debug

# Desactivar entorno virtual cuando termines
deactivate
```

### Frontend

```bash
# Desarrollo con hot-reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

---

## Flujo de Desarrollo

1. Activa el venv del backend antes de trabajar: `source backend/venv/bin/activate`
2. Corre el backend: `uvicorn app.main:app --reload` (puerto 8000)
3. Corre el frontend: `npm run dev` (puerto 5173)
4. El frontend hace requests al backend en `http://localhost:8000`

---

## Variables de Entorno Necesarias

Ver `.env.example` para la lista completa. Las críticas para empezar:

| Variable | Requerida | Descripción |
|---|---|---|
| `SECRET_KEY` |  Sí | Clave para firmar JWT tokens |
| `DATABASE_URL` |  Sí | URL de conexión DB (SQLite en dev) |
| `GOOGLE_MAPS_API_KEY` |  Fase 3 | Para optimización de rutas reales |
| `GROQ_API_KEY` |  Fase 5 | Para chatbot IA con Llama 3.1 |

---

## Fases del Proyecto

- [ ] **Fase 0** — Planificación y especificación
- [ ] **Fase 1** — Setup inicial 
- [ ] **Fase 2** — Backend: Auth + CRUD + CSV Upload
- [ ] **Fase 3** — IA Core: Forecasting + Alertas
- [ ] **Fase 4** — Optimización de Rutas
- [ ] **Fase 5** — Frontend Dashboard
- [X] **Fase 6** — Chatbot IA + Deploy

---

## Contribuir

Este proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: agregar endpoint de forecasting
fix: corregir cálculo de stock mínimo
docs: actualizar README con instrucciones deploy
refactor: modularizar servicio de alertas
```

---

## Licencia

MIT — Ver [LICENSE](LICENSE) para detalles.

---

*Desarrollado para PYMES bogotanas 🇨🇴 | Bogotá, Colombia — 2026*
