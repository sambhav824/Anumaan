from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class ScaleCalibrationSchema(BaseModel):
    pageNumber: int = Field(default=1, ge=1)
    knownDistance: float = Field(..., gt=0)
    unit: str = Field(default="m")
    pixelDistance: float = Field(..., gt=0)
    scaleRatio: float = Field(..., gt=0)
    isCalibrated: bool = True
    point1: Optional[Dict[str, float]] = None
    point2: Optional[Dict[str, float]] = None


class DrawingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    project_id: str
    estimate_id: Optional[str] = None


class DrawingCreate(DrawingBase):
    pass


class DrawingUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    scale_calibration: Optional[Dict[str, Any]] = None


class MeasurementBase(BaseModel):
    page_number: int = Field(default=1, ge=1)
    name: str = Field(..., min_length=1, max_length=255)
    measurement_type: str = Field(..., pattern="^(length|area|count)$")
    quantity: Decimal = Field(..., ge=0)
    unit: str = Field(default="m", max_length=20)
    coordinates: Optional[List[Dict[str, Any]]] = None
    construction_mapping: Optional[Dict[str, Any]] = None
    is_confirmed: bool = False
    notes: Optional[str] = Field(default=None, max_length=1000)


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    quantity: Optional[Decimal] = Field(default=None, ge=0)
    unit: Optional[str] = Field(default=None, max_length=20)
    coordinates: Optional[List[Dict[str, Any]]] = None
    construction_mapping: Optional[Dict[str, Any]] = None
    is_confirmed: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=1000)


class MeasurementRead(MeasurementBase):
    id: str
    organization_id: str
    drawing_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DrawingRead(BaseModel):
    id: str
    organization_id: str
    project_id: str
    estimate_id: Optional[str] = None
    name: str
    filename: str
    file_format: str
    file_size_bytes: int
    page_count: int
    scale_calibration: Optional[Dict[str, Any]] = None
    measurement_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DrawingDetailRead(DrawingRead):
    file_data_base64: Optional[str] = None
    measurements: List[MeasurementRead] = []


class TransferToEstimateRequest(BaseModel):
    estimate_id: str
    item_number: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=500)
    category: str = Field(default="material")
    quantity: Decimal = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    unit_rate: Decimal = Field(..., ge=0)
    notes: Optional[str] = None
    calculation_details: Optional[Dict[str, Any]] = None

