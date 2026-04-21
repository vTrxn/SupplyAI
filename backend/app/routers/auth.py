# backend/app/routers/auth.py
"""
Endpoints de autenticación: registro, login y perfil.
Rutas: POST /auth/register, POST /auth/login, GET /auth/me
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, Company
from app.models.inventory import Inventory
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.utils.jwt import hash_password, verify_password, create_access_token, decode_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Registra un nuevo usuario y crea su empresa automáticamente.
    Flujo: validar email único → crear empresa → crear usuario → retornar datos
    """
    # 1. Verificar que el email no esté registrado
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya está registrado"
        )

    # 2. Crear la empresa
    company = Company(nombre=data.nombre_empresa)
    db.add(company)
    await db.flush()  # flush para obtener el company.id sin hacer commit aún

    # 3. Crear el usuario con la contraseña hasheada
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        nombre=data.nombre,
        company_id=company.id,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Autentica un usuario y retorna un JWT.
    Flujo: buscar usuario → verificar password → generar token
    """
    # 1. Buscar usuario por email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # 2. Verificar credenciales (mismo mensaje para email y password - seguridad)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo. Contacta al administrador."
        )

    # 3. Generar JWT con datos necesarios para el frontend
    expire_hours = settings.ACCESS_TOKEN_EXPIRE_HOURS
    token = create_access_token(
        data={
            "user_id": user.id,
            "company_id": user.company_id,
            "email": user.email,
        },
        expires_delta=timedelta(hours=expire_hours)
    )

    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=expire_hours * 3600
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    authorization: str = None  # Header manual por simplicidad
):
    """
    Retorna los datos del usuario autenticado.
    Requiere header: Authorization: Bearer <token>
    """
    from fastapi import Request
    # Nota: en producción usar Depends(get_current_user) directamente
    # Por ahora retornamos un placeholder — lo conectamos en el siguiente paso
    raise HTTPException(status_code=501, detail="Implementar con get_current_user")

@router.post("/ensure-company")
async def ensure_company(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Se asegura de que el usuario autenticado vía Supabase tenga una empresa (Company)
    y exista en la tabla Users en nuestra base de datos.
    """
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
        
    token = auth.split(" ")[1]
    
    # Decodificar el token usando decode_token (que soporta Supabase JWT y fallbacks)
    token_data = decode_token(token)
    user_id = token_data.user_id
    email = token_data.email
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Token no contiene user_id")
        
    # Verificar si ya existe en bbdd
    # Importante: Como Supabase usa UUIDs o su propio formato, aseguramos usarlo en `id`
    result = await db.execute(select(User).where(User.id == user_id))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        return {"status": "ok", "message": "Usuario ya existe"}
        
    # Si no existe, crear una Company para el nuevo usuario
    company = Company(name=f"Empresa de {email or user_id}")
    db.add(company)
    await db.flush()  # Para obtener company.id
    
    # Crear el usuario en nuestra db asumiendo el ID que viene del sub_id/user_id
    new_user = User(
        id=user_id,
        email=email or f"{user_id}@placeholder.com",
        full_name=email.split("@")[0] if email else "Usuario",
        hashed_password="", # Autenticacion administrada por Supabase
        company_id=company.id,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    
    return {"status": "created", "company_id": company.id}
