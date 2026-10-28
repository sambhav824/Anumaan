from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, func

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership
from app.models.models import Invoice, Project, Quotation, Client, Profile
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceRead

router = APIRouter(prefix="/api/organizations/{organization_id}/invoices", tags=["Invoices & Payment Milestones"])


async def generate_unique_invoice_number(organization_id: str, db: AsyncSession) -> str:
    current_year = datetime.now().year
    prefix = f"INV-{current_year}-"

    res = await db.execute(
        select(Invoice.invoice_number)
        .where(
            and_(
                Invoice.organization_id == organization_id,
                Invoice.invoice_number.like(f"{prefix}%")
            )
        )
    )
    existing = {r[0] for r in res.fetchall()}

    seq = len(existing) + 1
    candidate = f"{prefix}{seq:04d}"
    while candidate in existing:
        seq += 1
        candidate = f"{prefix}{seq:04d}"
    return candidate


def format_invoice_read(inv: Invoice, proj_name: Optional[str] = None, client_name: Optional[str] = None, quot_num: Optional[str] = None) -> InvoiceRead:
    return InvoiceRead(
        id=inv.id,
        organization_id=inv.organization_id,
        project_id=inv.project_id,
        quotation_id=inv.quotation_id,
        invoice_number=inv.invoice_number,
        milestone_name=inv.milestone_name,
        percentage=inv.percentage,
        amount=inv.amount,
        status=inv.status,
        due_date=inv.due_date,
        paid_date=inv.paid_date,
        paid_amount=inv.paid_amount,
        payment_method=inv.payment_method,
        notes=inv.notes,
        project_name=proj_name,
        client_name=client_name,
        quotation_number=quot_num,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("", response_model=List[InvoiceRead])
async def list_invoices(
    organization_id: str,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    quotation_id: Optional[str] = Query(None, description="Filter by quotation ID"),
    status: Optional[str] = Query(None, description="Filter by status (draft, sent, paid, partially_paid, overdue)"),
    search: Optional[str] = Query(None, description="Search by invoice number or milestone name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(
            Invoice,
            Project.name.label("project_name"),
            Client.name.label("client_name"),
            Quotation.quotation_number.label("quotation_number")
        )
        .join(Project, Invoice.project_id == Project.id)
        .outerjoin(Client, Project.client_id == Client.id)
        .outerjoin(Quotation, Invoice.quotation_id == Quotation.id)
        .where(Invoice.organization_id == organization_id)
        .order_by(Invoice.created_at.desc())
    )

    if project_id:
        query = query.where(Invoice.project_id == project_id)
    if quotation_id:
        query = query.where(Invoice.quotation_id == quotation_id)
    if status:
        query = query.where(Invoice.status == status.strip().lower())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Invoice.invoice_number.ilike(term),
                Invoice.milestone_name.ilike(term),
                Project.name.ilike(term),
                Client.name.ilike(term),
            )
        )

    query = query.offset(skip).limit(limit)
    res = await db.execute(query)
    rows = res.all()

    return [format_invoice_read(row[0], row[1], row[2], row[3]) for row in rows]


@router.post("", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    organization_id: str,
    invoice_in: InvoiceCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_org_membership(organization_id, current_user.id, db)

    # Verify project
    proj_res = await db.execute(
        select(Project, Client.name.label("client_name"))
        .outerjoin(Client, Project.client_id == Client.id)
        .where(
            Project.id == invoice_in.project_id,
            Project.organization_id == organization_id
        )
    )
    proj_row = proj_res.first()
    if not proj_row:
        raise HTTPException(status_code=404, detail="Project not found in this organization")
    project, client_name = proj_row

    # Verify quotation if provided
    quot_num = None
    if invoice_in.quotation_id:
        quot_res = await db.execute(
            select(Quotation.quotation_number).where(
                Quotation.id == invoice_in.quotation_id,
                Quotation.organization_id == organization_id
            )
        )
        quot_row = quot_res.first()
        if not quot_row:
            raise HTTPException(status_code=404, detail="Referenced quotation not found")
        quot_num = quot_row[0]

    # Assign invoice number if not provided
    inv_num = invoice_in.invoice_number
    if not inv_num or not inv_num.strip():
        inv_num = await generate_unique_invoice_number(organization_id, db)
    else:
        # Check uniqueness
        existing = await db.execute(
            select(Invoice.id).where(
                Invoice.organization_id == organization_id,
                Invoice.invoice_number == inv_num.strip()
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Invoice number '{inv_num}' already exists.")

    new_inv = Invoice(
        organization_id=organization_id,
        project_id=invoice_in.project_id,
        quotation_id=invoice_in.quotation_id,
        invoice_number=inv_num.strip(),
        milestone_name=invoice_in.milestone_name.strip(),
        percentage=invoice_in.percentage or Decimal("0.00"),
        amount=invoice_in.amount,
        status=invoice_in.status or "draft",
        due_date=invoice_in.due_date,
        paid_date=invoice_in.paid_date,
        paid_amount=invoice_in.paid_amount or Decimal("0.00"),
        payment_method=invoice_in.payment_method,
        notes=invoice_in.notes,
        created_by=current_user.id,
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)

    return format_invoice_read(new_inv, project.name, client_name, quot_num)


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    organization_id: str,
    invoice_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(
            Invoice,
            Project.name.label("project_name"),
            Client.name.label("client_name"),
            Quotation.quotation_number.label("quotation_number")
        )
        .join(Project, Invoice.project_id == Project.id)
        .outerjoin(Client, Project.client_id == Client.id)
        .outerjoin(Quotation, Invoice.quotation_id == Quotation.id)
        .where(
            Invoice.id == invoice_id,
            Invoice.organization_id == organization_id
        )
    )
    res = await db.execute(query)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return format_invoice_read(row[0], row[1], row[2], row[3])


@router.patch("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    organization_id: str,
    invoice_id: str,
    update_in: InvoiceUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_org_membership(organization_id, current_user.id, db)

    inv = await db.get(Invoice, invoice_id)
    if not inv or inv.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if update_in.milestone_name is not None:
        inv.milestone_name = update_in.milestone_name.strip()
    if update_in.percentage is not None:
        inv.percentage = update_in.percentage
    if update_in.amount is not None:
        inv.amount = update_in.amount
    if update_in.status is not None:
        inv.status = update_in.status
    if update_in.due_date is not None:
        inv.due_date = update_in.due_date
    if update_in.paid_date is not None:
        inv.paid_date = update_in.paid_date
    if update_in.paid_amount is not None:
        inv.paid_amount = update_in.paid_amount
        if inv.paid_amount >= inv.amount and inv.amount > 0:
            inv.status = "paid"
            if not inv.paid_date:
                inv.paid_date = date.today()
        elif inv.paid_amount > 0:
            inv.status = "partially_paid"
    if update_in.payment_method is not None:
        inv.payment_method = update_in.payment_method
    if update_in.notes is not None:
        inv.notes = update_in.notes

    await db.commit()
    await db.refresh(inv)

    # Fetch context names
    proj_res = await db.execute(
        select(Project.name, Client.name)
        .outerjoin(Client, Project.client_id == Client.id)
        .where(Project.id == inv.project_id)
    )
    proj_row = proj_res.first()
    proj_name = proj_row[0] if proj_row else None
    client_name = proj_row[1] if proj_row else None

    quot_num = None
    if inv.quotation_id:
        quot_res = await db.execute(select(Quotation.quotation_number).where(Quotation.id == inv.quotation_id))
        quot_row = quot_res.first()
        quot_num = quot_row[0] if quot_row else None

    return format_invoice_read(inv, proj_name, client_name, quot_num)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    organization_id: str,
    invoice_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_org_membership(organization_id, current_user.id, db)

    inv = await db.get(Invoice, invoice_id)
    if not inv or inv.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await db.delete(inv)
    await db.commit()

