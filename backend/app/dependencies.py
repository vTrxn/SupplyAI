from fastapi import Depends
from fastapi.security import HTTPBearer
from app.utils.jwt import decode_token

security = HTTPBearer(auto_error=False)

async def get_token_data(credentials=Depends(security)):
    return decode_token(credentials.credentials if credentials else None)
