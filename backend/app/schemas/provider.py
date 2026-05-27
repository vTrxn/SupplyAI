from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProviderCreate(BaseModel):
    name: str

class ProviderUpdate(BaseModel):
    name: Optional[str] = None

class ProviderResponse(BaseModel):
    id: str
    company_id: str
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}
