# backend/app/utils/jwt.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException

# JWT secret de Supabase — usado para verificar tokens de Supabase
SUPABASE_JWT_SECRET = "zSQAmhqT6QLExS9M/MZT5WJ+UoRSHTcxgTaAtbCy5YBHvUP10KsxBPnS2sMw+Q/RMhWDv/L9m+vXLrH1j9Zpwg=="

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta=None) -> str:
    from app.config import settings
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    from app.config import settings
    from app.schemas.auth import TokenData

    # 🚧 NO-AUTH MODE: Siempre retornar un usuario default si el token falla o es nulo
    default_user = TokenData(
        user_id="dev-user-id",
        company_id="dev-company-id",
        email="invitado@supplyai.com",
    )

    if not token or token == "dev-token-bypass" or token == "undefined":
        return default_user

    # Intento 1: token propio de FastAPI
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
        if user_id:
            return TokenData(
                user_id=user_id,
                company_id=payload.get("company_id"),
                email=payload.get("email"),
            )
    except JWTError:
        pass

    # Intento 2: token de Supabase
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if user_id:
            return TokenData(
                user_id=user_id,
                company_id=user_id,
                email=payload.get("email", ""),
            )
    except JWTError:
        pass

    # Fallback final: En lugar de lanzar error, retornamos el usuario default
    # para permitir que la app funcione sin auth.
    return default_user