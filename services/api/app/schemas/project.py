from typing import Optional, Literal
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    project_type: Literal["building", "road"] = "building"
    client_id: Optional[str] = None
    site_location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    start_date: Optional[date] = None
    status: Literal["planning", "in_progress", "completed", "archived"] = "planning"
    quotation_language: Literal["en", "mr", "hi"] = "en"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    project_type: Optional[Literal["building", "road"]] = None
    client_id: Optional[str] = None
    site_location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    start_date: Optional[date] = None
    status: Optional[Literal["planning", "in_progress", "completed", "archived"]] = None
    quotation_language: Optional[Literal["en", "mr", "hi"]] = None


class ProjectRead(ProjectBase):
    id: str
    organization_id: str
    client_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardMetrics(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    draft_estimates: int = 0
    pending_quotations: int = 0
    accepted_quotations: int = 0
    total_clients: int = 0
