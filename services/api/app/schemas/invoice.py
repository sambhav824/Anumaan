from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class InvoiceBase(BaseModel):
    milestone_name: str = Field(..., min_length=1, max_length=255, description="Name or milestone stage, e.g. Advance, Plinth, Slab")
    percentage: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0, le=100)
    amount: Decimal = Field(..., ge=0, description="Amount payable for this milestone")
    status: Optional[str] = Field(default="draft", pattern="^(draft|sent|paid|partially_paid|overdue)$")
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    paid_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    payment_method: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)


class InvoiceCreate(InvoiceBase):
    project_id: str
    quotation_id: Optional[str] = None
    invoice_number: Optional[str] = Field(default=None, max_length=50)


class InvoiceUpdate(BaseModel):
    milestone_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    percentage: Optional[Decimal] = Field(default=None, ge=0, le=100)
    amount: Optional[Decimal] = Field(default=None, ge=0)
    status: Optional[str] = Field(default=None, pattern="^(draft|sent|paid|partially_paid|overdue)$")
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    paid_amount: Optional[Decimal] = Field(default=None, ge=0)
    payment_method: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)


class InvoiceRead(InvoiceBase):
    id: str
    organization_id: str
    project_id: str
    quotation_id: Optional[str] = None
    invoice_number: str
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    quotation_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

