from decimal import Decimal
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, computed_field
import unicodedata

RateCategory = Literal["material", "labour", "equipment", "other", "composite", "subcontract"]
RateSource = Literal["Manual", "Supplier Quote", "Schedule of Rates"]
RateType = Literal["raw_material", "labour_only", "equipment_only", "completed_work", "composite", "subcontract"]
RateStatus = Literal["verified_source", "illustrative_needs_verification"]


class RateItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    category: RateCategory = "material"
    rate_type: RateType = "raw_material"
    description: Optional[str] = Field(None, max_length=1000)
    unit: str = Field("nos", max_length=20)
    material_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    labour_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    equipment_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    combined_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    rate_source: RateSource = "Manual"
    supplier_or_source_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    supplier_or_location: Optional[str] = Field(None, max_length=255)
    region: str = Field("national_cpwd", max_length=100)
    source_date: Optional[str] = Field(None, max_length=50)
    rate_status: RateStatus = "verified_source"
    specification: Optional[str] = Field(None, max_length=500)
    is_custom: bool = False
    is_archived: bool = False
    canonical_id: Optional[str] = Field(None, max_length=50)
    default_item_id: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Rate item name cannot be empty.")
        return unicodedata.normalize("NFKC", v.strip())

    @model_validator(mode="before")
    @classmethod
    def handle_aliases_and_combination(cls, data: any) -> any:
        if isinstance(data, dict):
            if "item_name" in data and "name" not in data:
                data["name"] = data["item_name"]
            if "unit_rate" in data and "combined_rate" not in data:
                data["combined_rate"] = data["unit_rate"]
            # Sync supplier_or_location with location or supplier_or_source_name
            loc = data.get("location")
            src = data.get("supplier_or_source_name")
            supp_loc = data.get("supplier_or_location")
            if supp_loc and not loc and not src:
                data["location"] = supp_loc
                data["supplier_or_source_name"] = supp_loc
            elif (loc or src) and not supp_loc:
                data["supplier_or_location"] = ", ".join(filter(None, [src, loc]))
        return data


class RateItemCreate(RateItemBase):
    pass


class RateItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    category: Optional[RateCategory] = None
    rate_type: Optional[RateType] = None
    description: Optional[str] = Field(None, max_length=1000)
    unit: Optional[str] = Field(None, max_length=20)
    material_rate: Optional[Decimal] = Field(None, ge=0)
    labour_rate: Optional[Decimal] = Field(None, ge=0)
    equipment_rate: Optional[Decimal] = Field(None, ge=0)
    combined_rate: Optional[Decimal] = Field(None, ge=0)
    rate_source: Optional[RateSource] = None
    supplier_or_source_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    supplier_or_location: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=100)
    source_date: Optional[str] = Field(None, max_length=50)
    rate_status: Optional[RateStatus] = None
    specification: Optional[str] = Field(None, max_length=500)
    is_custom: Optional[bool] = None
    is_archived: Optional[bool] = None
    canonical_id: Optional[str] = Field(None, max_length=50)
    default_item_id: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: any) -> any:
        if isinstance(data, dict):
            if "item_name" in data and "name" not in data:
                data["name"] = data["item_name"]
            if "unit_rate" in data and "combined_rate" not in data:
                data["combined_rate"] = data["unit_rate"]
        return data


class RateItemRead(RateItemBase):
    id: str
    organization_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def item_name(self) -> str:
        return self.name

    @computed_field
    @property
    def unit_rate(self) -> Decimal:
        return self.combined_rate

    model_config = {"from_attributes": True}


class SeedDefaultRatesRequest(BaseModel):
    region: str = Field("national_cpwd", description="Region benchmark to seed (e.g. national_cpwd, maharashtra_pwd, karnataka_pwd)")
    overwrite_custom: bool = Field(False, description="Whether to overwrite existing customized items")


class RegionInfo(BaseModel):
    id: str
    name: str
    state: str
    authority: str
    source_doc: str
    default: bool
