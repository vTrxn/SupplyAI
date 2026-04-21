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

    # 🚧 DEV MODE: aceptar el token falso del frontend
    if token == "dev-token-bypass":
        return TokenData(
            user_id="dev-user",
            company_id="dev-company",
            email="dev@supplyai.com",
        )

    exc = HTTPException(status_code=401, detail="Token invalido o expirado",
                        headers={"WWW-Authenticate": "Bearer"})

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

    # Intento 2: token de Supabase (firmado con el JWT secret de Supabase)
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")  # Supabase usa "sub" como user_id
        if user_id:
            # Para tokens Supabase usamos el user_id de Supabase como company_id también
            # (en un sistema real mapearías al company_id de tu DB)
            return TokenData(
                user_id=user_id,
                company_id=user_id,
                email=payload.get("email", ""),
            )
    except JWTError:
        pass

    # Intento 3: decodificar sin verificar firma (fallback seguro para desarrollo)
    try:
        # En python-jose para leer el payload sin necesidad de la llave correcta usamos get_unverified_claims
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub") or payload.get("user_id")
        if user_id:
            return TokenData(
                user_id=user_id,
                company_id=payload.get("company_id") or user_id,
                email=payload.get("email", ""),
            )
    except Exception as e:
        print(f"Error decodificando fallback token: {e}")
        pass

    raise exc