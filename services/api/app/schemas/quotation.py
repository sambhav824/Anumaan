from typing import Optional, List, Dict, Any, Literal
from decimal import Decimal
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict, model_validator


QuotationStatus = Literal["draft", "issued", "accepted", "rejected", "expired"]
QuotationLanguage = Literal["en", "mr", "hi"]


class QuotationBase(BaseModel):
    language: QuotationLanguage = "en"
    issue_date: Optional[date] = None
    valid_until_date: Optional[date] = None
    payment_terms: Optional[str] = None
    exclusions: Optional[str] = None
    notes: Optional[str] = None
    client_instructions: Optional[str] = None
    authorized_signatory_name: Optional[str] = None
    authorized_signatory_designation: Optional[str] = None
    tax_configured: bool = False
    tax_name: str = "GST"
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class QuotationCreate(QuotationBase):
    estimate_id: str
    quotation_number: Optional[str] = None
    overhead_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    contingency_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    discount_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)


class QuotationUpdate(BaseModel):
    language: Optional[QuotationLanguage] = None
    issue_date: Optional[date] = None
    valid_until_date: Optional[date] = None
    payment_terms: Optional[str] = None
    exclusions: Optional[str] = None
    notes: Optional[str] = None
    client_instructions: Optional[str] = None
    authorized_signatory_name: Optional[str] = None
    authorized_signatory_designation: Optional[str] = None
    tax_configured: Optional[bool] = None
    tax_name: Optional[str] = None
    tax_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)
    overhead_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    contingency_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    discount_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)


class QuotationIssueRequest(BaseModel):
    confirm_tax_configured: bool = True
    tax_name: Optional[str] = None
    tax_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)
    issue_date: Optional[date] = None
    valid_until_date: Optional[date] = None


class QuotationStatusUpdate(BaseModel):
    status: Literal["accepted", "rejected", "expired"]


class QuotationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    estimate_id: str
    project_id: str
    client_id: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    quotation_number: str
    status: QuotationStatus
    language: QuotationLanguage
    issue_date: Optional[date] = None
    valid_until_date: Optional[date] = None
    subtotal: Decimal
    overhead_amount: Decimal
    contingency_amount: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_configured: bool
    tax_name: str
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    grand_total: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def populate_grand_total(self):
        if self.grand_total is None:
            self.grand_total = self.total_amount
        return self


class QuotationDetailRead(QuotationRead):
    payment_terms: Optional[str] = None
    exclusions: Optional[str] = None
    notes: Optional[str] = None
    client_instructions: Optional[str] = None
    authorized_signatory_name: Optional[str] = None
    authorized_signatory_designation: Optional[str] = None
    overhead_pct: Decimal
    contingency_pct: Decimal
    discount_pct: Decimal
    snapshot: Optional[Dict[str, Any]] = None
    items: Optional[List[Dict[str, Any]]] = None
    company_details: Optional[Dict[str, Any]] = None
    client_details: Optional[Dict[str, Any]] = None
    project_details: Optional[Dict[str, Any]] = None
