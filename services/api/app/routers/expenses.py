from decimal import Decimal
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership
from app.models.models import ActualExpense, Estimate, Profile
from app.schemas.expenses import (
    ActualExpenseRead,
    ActualExpenseCreate,
    EstimateCostVarianceSummary,
    CategoryExpenseBreakdown,
)

router = APIRouter(
    prefix="/api/organizations/{organization_id}/estimates/{estimate_id}/expenses",
    tags=["Actual Expenses & Cost Tracking"],
)


@router.get("", response_model=List[ActualExpenseRead])
async def list_expenses(
    organization_id: str,
    estimate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all actual recorded expenses for an estimate.
    Organization-level isolation enforced.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    # Verify estimate belongs to this organization
    est_res = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id, Estimate.organization_id == organization_id)
    )
    if not est_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estimate not found")

    query = (
        select(ActualExpense)
        .where(
            ActualExpense.organization_id == organization_id,
            ActualExpense.estimate_id == estimate_id,
        )
        .order_by(ActualExpense.expense_date.desc(), ActualExpense.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.post("", response_model=ActualExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    organization_id: str,
    estimate_id: str,
    expense_in: ActualExpenseCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Records an actual expense against an estimate.
    Does not modify original quotation or estimate totals.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    est_res = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id, Estimate.organization_id == organization_id)
    )
    if not est_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estimate not found")

    expense = ActualExpense(
        organization_id=organization_id,
        estimate_id=estimate_id,
        category=expense_in.category,
        description=expense_in.description,
        amount=expense_in.amount,
        expense_date=expense_in.expense_date,
        vendor_or_payee=expense_in.vendor_or_payee,
        invoice_or_voucher_ref=expense_in.invoice_or_voucher_ref,
        notes=expense_in.notes,
        created_by=current_user.id,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    organization_id: str,
    estimate_id: str,
    expense_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes an actual recorded expense.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    res = await db.execute(
        select(ActualExpense).where(
            ActualExpense.id == expense_id,
            ActualExpense.organization_id == organization_id,
            ActualExpense.estimate_id == estimate_id,
        )
    )
    expense = res.scalars().first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    await db.delete(expense)
    await db.commit()
    return None


@router.get("/variance", response_model=EstimateCostVarianceSummary)
async def get_estimate_cost_variance(
    organization_id: str,
    estimate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates transparent cost variance between original estimate and actual recorded costs.
    Formula:
    - difference = actual - estimated
    - variance_pct = ((actual - estimated) / estimated) * 100 if estimated > 0 else 0
    - status = 'over_budget' if difference > 0, 'under_budget' if difference < 0, 'on_budget' if difference == 0
    """
    await verify_org_membership(organization_id, current_user.id, db)

    est_res = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id, Estimate.organization_id == organization_id)
    )
    estimate = est_res.scalars().first()
    if not estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estimate not found")

    # Fetch all expenses
    exp_res = await db.execute(
        select(ActualExpense).where(
            ActualExpense.organization_id == organization_id,
            ActualExpense.estimate_id == estimate_id,
        )
    )
    expenses = exp_res.scalars().all()

    estimated_amt = Decimal(str(estimate.total_amount or estimate.subtotal or "0.00"))
    actual_amt = Decimal("0.00")
    cat_totals: Dict[str, Dict[str, Any]] = {}

    for exp in expenses:
        amt = Decimal(str(exp.amount))
        actual_amt += amt
        cat = exp.category
        if cat not in cat_totals:
            cat_totals[cat] = {"total": Decimal("0.00"), "count": 0}
        cat_totals[cat]["total"] += amt
        cat_totals[cat]["count"] += 1

    diff = actual_amt - estimated_amt
    if estimated_amt > Decimal("0.00"):
        variance_pct = round((diff / estimated_amt) * Decimal("100.0"), 2)
    elif actual_amt > Decimal("0.00"):
        variance_pct = Decimal("100.00")
    else:
        variance_pct = Decimal("0.00")

    if diff > Decimal("0.00"):
        status_val = "over_budget"
    elif diff < Decimal("0.00"):
        status_val = "under_budget"
    else:
        status_val = "on_budget"

    categories_list = [
        CategoryExpenseBreakdown(
            category=cat,
            total_amount=data["total"],
            expense_count=data["count"]
        )
        for cat, data in cat_totals.items()
    ]

    return EstimateCostVarianceSummary(
        estimate_id=estimate.id,
        estimate_name=estimate.name,
        estimated_amount=estimated_amt,
        actual_amount=actual_amt,
        difference=diff,
        variance_pct=variance_pct,
        status=status_val,
        total_expenses_count=len(expenses),
        categories_breakdown=categories_list,
    )
