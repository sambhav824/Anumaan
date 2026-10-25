from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Client or company name")
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = Field(None, max_length=1000)
    gstin: Optional[str] = Field(None, max_length=30)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = Field(None, max_length=1000)
    gstin: Optional[str] = Field(None, max_length=30)


class ClientRead(ClientBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
