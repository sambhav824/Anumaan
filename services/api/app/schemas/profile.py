from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ProfileBase(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    language_preference: Literal["en", "mr", "hi"] = "en"
    avatar_url: Optional[str] = Field(None, max_length=1024)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    language_preference: Optional[Literal["en", "mr", "hi"]] = None
    avatar_url: Optional[str] = Field(None, max_length=1024)


class ProfileRead(ProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
