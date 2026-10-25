from decimal import Decimal
from typing import Optional, Literal, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
import unicodedata


class BOQItemBase(BaseModel):
    item_number: str = Field(..., max_length=50)
    description: str = Field(..., min_length=1, max_length=1000)
    category: str = Field("general", max_length=50)
    quantity: Decimal = Field(default=Decimal("0.0000"), ge=0)
    unit: str = Field(default="nos", max_length=20)
    unit_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    amount: Optional[Decimal] = None
    is_manual: bool = False
    calculation_type: Optional[str] = None
    formula_type: Optional[str] = None
    calculation_details: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    sort_order: int = 0

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Item description cannot be empty.")
        return unicodedata.normalize("NFKC", v.strip())

    @model_validator(mode="before")
    @classmethod
    def unify_calc_type(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "formula_type" in data and not data.get("calculation_type"):
                data["calculation_type"] = data["formula_type"]
        return data


class BOQItemCreate(BOQItemBase):
    pass


class BOQItemUpdate(BaseModel):
    item_number: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_rate: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    is_manual: Optional[bool] = None
    calculation_type: Optional[str] = None
    calculation_details: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class BOQItemRead(BOQItemBase):
    id: str
    organization_id: str
    estimate_id: str
    amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EstimateBase(BaseModel):
    project_id: str
    estimate_number: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=255)
    category: Literal["building", "road"] = "building"
    project_type: Optional[Literal["building", "road"]] = None
    overhead_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    contingency_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    gst_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name cannot be empty.")
        return unicodedata.normalize("NFKC", v.strip())

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # project_type -> category
            if "project_type" in data and not data.get("category"):
                data["category"] = data["project_type"]
            # overhead_percent -> overhead_pct
            if "overhead_percent" in data and "overhead_pct" not in data:
                data["overhead_pct"] = data["overhead_percent"]
            if "contingency_percent" in data and "contingency_pct" not in data:
                data["contingency_pct"] = data["contingency_percent"]
            if "discount_percent" in data and "discount_pct" not in data:
                data["discount_pct"] = data["discount_percent"]
            if "gst_percent" in data and "gst_pct" not in data:
                data["gst_pct"] = data["gst_percent"]
        return data


class EstimateCreate(EstimateBase):
    items: Optional[List[BOQItemCreate]] = None


class EstimateStatusUpdate(BaseModel):
    status: Literal["draft", "submitted", "approved", "archived"]


class EstimateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[Literal["building", "road"]] = None
    project_type: Optional[Literal["building", "road"]] = None
    status: Optional[Literal["draft", "submitted", "approved", "archived"]] = None
    overhead_pct: Optional[Decimal] = None
    overhead_percent: Optional[Decimal] = None
    contingency_pct: Optional[Decimal] = None
    contingency_percent: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    gst_pct: Optional[Decimal] = None
    gst_percent: Optional[Decimal] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_update_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "project_type" in data and not data.get("category"):
                data["category"] = data["project_type"]
            if "overhead_percent" in data and "overhead_pct" not in data:
                data["overhead_pct"] = data["overhead_percent"]
            if "contingency_percent" in data and "contingency_pct" not in data:
                data["contingency_pct"] = data["contingency_percent"]
            if "discount_percent" in data and "discount_pct" not in data:
                data["discount_pct"] = data["discount_percent"]
            if "gst_percent" in data and "gst_pct" not in data:
                data["gst_pct"] = data["gst_percent"]
        return data


class EstimateRead(EstimateBase):
    id: str
    organization_id: str
    project_name: Optional[str] = None
    project_type: Optional[str] = None
    status: Literal["draft", "submitted", "approved", "archived"]
    subtotal: Decimal
    overhead_amount: Decimal = Decimal("0.00")
    contingency_amount: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    pre_tax_subtotal: Decimal = Decimal("0.00")
    taxable_amount: Decimal = Decimal("0.00")
    gst_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    item_count: int = 0
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EstimateDetailRead(EstimateRead):
    items: List[BOQItemRead] = []
    snapshot: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class CalculationRequest(BaseModel):
    calculation_type: Optional[str] = None
    formula_type: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="allow")
