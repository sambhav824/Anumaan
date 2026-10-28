from decimal import Decimal
from typing import Optional, List, Dict, Literal
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
import unicodedata

ExpenseCategory = Literal["material", "labour", "equipment", "transport", "subcontract", "other"]
BudgetStatus = Literal["over_budget", "under_budget", "on_budget"]


class ActualExpenseBase(BaseModel):
    category: ExpenseCategory = "material"
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal = Field(..., ge=0)
    expense_date: date
    vendor_or_payee: Optional[str] = Field(None, max_length=255)
    invoice_or_voucher_ref: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Expense description cannot be empty.")
        return unicodedata.normalize("NFKC", v.strip())


class ActualExpenseCreate(ActualExpenseBase):
    pass


class ActualExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[Decimal] = Field(None, ge=0)
    expense_date: Optional[date] = None
    vendor_or_payee: Optional[str] = Field(None, max_length=255)
    invoice_or_voucher_ref: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)


class ActualExpenseRead(ActualExpenseBase):
    id: str
    organization_id: str
    estimate_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}



class CategoryExpenseBreakdown(BaseModel):
    category: str
    total_amount: Decimal
    expense_count: int


class EstimateCostVarianceSummary(BaseModel):
    estimate_id: str
    estimate_name: str
    estimated_amount: Decimal
    actual_amount: Decimal
    difference: Decimal  # actual - estimated
    variance_pct: Decimal  # ((actual - estimated) / estimated) * 100 if estimated > 0 else 0
    status: BudgetStatus  # over_budget, under_budget, on_budget
    total_expenses_count: int
    categories_breakdown: List[CategoryExpenseBreakdown]
