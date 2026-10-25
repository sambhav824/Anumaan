import re
import unicodedata
from typing import Optional, Literal, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


def validate_organization_name(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    if not v.strip():
        raise ValueError("Organization name cannot be empty or whitespace only.")
    normalized = unicodedata.normalize("NFKC", v.strip())
    if len(normalized) < 2 or len(normalized) > 255:
        raise ValueError("Organization name must be between 2 and 255 characters.")
    if re.search(r"[\x00-\x1F\x7F-\x9F]", normalized):
        raise ValueError("Organization name contains invalid control characters.")
    if re.search(r"[\u200B-\u200D\uFEFF]", normalized):
        raise ValueError("Organization name contains invalid zero-width characters.")
    return normalized


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    owner_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    business_address: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=20)
    gstin: Optional[str] = Field(None, max_length=30)
    logo_url: Optional[str] = Field(None, max_length=1024)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return validate_organization_name(v)

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip() != "":
            v = v.strip().upper()
            gst_regex = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
            if not re.match(gst_regex, v):
                pass
        return v


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    owner_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    business_address: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=20)
    gstin: Optional[str] = Field(None, max_length=30)
    logo_url: Optional[str] = Field(None, max_length=1024)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        return validate_organization_name(v)


class MemberRead(BaseModel):
    id: str
    organization_id: str
    user_id: str
    role: Literal["owner", "admin", "member"]
    user_full_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationRead(OrganizationBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
