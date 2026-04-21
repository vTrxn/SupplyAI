# backend/app/schemas/auth.py
"""
Schemas Pydantic para autenticación JWT.
Validan y serializan datos de entrada/salida de los endpoints de auth.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserRegister(BaseModel):
    """Schema para registro de nuevo usuario + empresa"""
    email: EmailStr
    password: str
    nombre: str
    nombre_empresa: str  # Se crea automáticamente la empresa al registrar

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        # Validación básica: mínimo 8 caracteres
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class UserLogin(BaseModel):
    """Schema para login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Respuesta del endpoint de login: el JWT"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos hasta expiración


class TokenData(BaseModel):
    """Payload decodificado del JWT — se usa internamente"""
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    """Datos del usuario que se devuelven al frontend (sin password)"""
    id: int
    email: str
    nombre: str
    company_id: int
    is_active: bool

    model_config = {"from_attributes": True}  # Permite leer desde ORM