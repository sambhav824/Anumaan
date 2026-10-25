from typing import List, Optional, Literal, Dict, Any
from decimal import Decimal
from datetime import datetime, date, timezone
import uuid
import random
import string
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func, and_
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership
from app.models.models import Quotation, Estimate, BOQItem, Project, Client, Organization, Profile
from app.schemas.quotation import (
    QuotationRead,
    QuotationDetailRead,
    QuotationCreate,
    QuotationUpdate,
    QuotationIssueRequest,
    QuotationStatusUpdate,
)
from app.core.calculations import (
    calculate_estimate_totals,
    quantize_currency,
)
from app.core.pdf_generator import generate_quotation_pdf
from app.core.excel_generator import generate_quotation_excel


router = APIRouter(prefix="/api/organizations/{organization_id}/quotations", tags=["Quotations"])


def format_quotation_response(q: Quotation, proj_name: Optional[str] = None, client_name: Optional[str] = None) -> QuotationRead:
    return QuotationRead(
        id=q.id,
        organization_id=q.organization_id,
        estimate_id=q.estimate_id,
        project_id=q.project_id,
        client_id=q.client_id,
        project_name=proj_name or (q.project.name if getattr(q, "project", None) else None),
        client_name=client_name or (q.client.name if getattr(q, "client", None) else None),
        quotation_number=q.quotation_number,
        status=q.status,
        language=q.language,
        issue_date=q.issue_date,
        valid_until_date=q.valid_until_date,
        subtotal=q.subtotal,
        overhead_amount=q.overhead_amount,
        contingency_amount=q.contingency_amount,
        discount_amount=q.discount_amount,
        taxable_amount=q.taxable_amount,
        tax_configured=q.tax_configured,
        tax_name=q.tax_name,
        tax_rate=q.tax_rate,
        tax_amount=q.tax_amount,
        total_amount=q.total_amount,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


async def generate_unique_quotation_number(organization_id: str, db: AsyncSession) -> str:
    current_year = datetime.now().year
    prefix = f"QT-{current_year}-"

    # Query existing quotation numbers for this org with this prefix
    res = await db.execute(
        select(Quotation.quotation_number)
        .where(
            and_(
                Quotation.organization_id == organization_id,
                Quotation.quotation_number.like(f"{prefix}%")
            )
        )
    )
    existing_nums = {r[0] for r in res.fetchall()}

    seq = len(existing_nums) + 1
    candidate = f"{prefix}{seq:04d}"
    while candidate in existing_nums:
        seq += 1
        candidate = f"{prefix}{seq:04d}"

    return candidate


def build_live_payload_from_quotation(
    q: Quotation,
    org: Organization,
    client: Optional[Client],
    proj: Project,
    items: List[BOQItem]
) -> Dict[str, Any]:
    return {
        "quotation_number": q.quotation_number,
        "status": q.status,
        "language": q.language,
        "issue_date": str(q.issue_date or date.today().isoformat()),
        "valid_until_date": str(q.valid_until_date or ""),
        "company": {
            "name": org.name,
            "owner_person": org.owner_person,
            "email": org.email,
            "phone": org.phone,
            "business_address": org.business_address,
            "city": org.city,
            "state": org.state,
            "pin_code": org.pin_code,
            "gstin": org.gstin,
            "logo_url": org.logo_url,
        },
        "client": {
            "name": client.name if client else "",
            "contact_person": client.contact_person if client else "",
            "email": client.email if client else "",
            "phone": client.phone if client else "",
            "billing_address": client.billing_address if client else "",
            "gstin": client.gstin if client else "",
        } if client else {},
        "project": {
            "name": proj.name if proj else "",
            "project_type": proj.project_type if proj else "",
            "site_location": proj.site_location if proj else "",
            "city": proj.city if proj else "",
            "state": proj.state if proj else "",
            "reference_estimate_number": q.estimate.estimate_number if getattr(q, "estimate", None) else "",
        },
        "items": [
            {
                "item_number": it.item_number,
                "description": it.description,
                "category": it.category,
                "specification": it.notes or (it.calculation_details.get("formula") if it.calculation_details else None),
                "quantity": float(it.quantity),
                "unit": it.unit,
                "unit_rate": float(it.unit_rate),
                "amount": float(it.amount),
            }
            for it in items
        ],
        "financials": {
            "subtotal": float(q.subtotal),
            "overhead_pct": float(q.overhead_pct),
            "overhead_amount": float(q.overhead_amount),
            "contingency_pct": float(q.contingency_pct),
            "contingency_amount": float(q.contingency_amount),
            "discount_pct": float(q.discount_pct),
            "discount_amount": float(q.discount_amount),
            "taxable_amount": float(q.taxable_amount),
            "tax_configured": q.tax_configured,
            "tax_name": q.tax_name,
            "tax_rate": float(q.tax_rate),
            "tax_amount": float(q.tax_amount),
            "total_amount": float(q.total_amount),
            "currency": "INR",
        },
        "payment_terms": q.payment_terms or "",
        "exclusions": q.exclusions or "",
        "notes": q.notes or "",
        "client_instructions": q.client_instructions or "",
        "authorized_signatory_name": q.authorized_signatory_name or org.owner_person or "",
        "authorized_signatory_designation": q.authorized_signatory_designation or "Authorized Signatory",
    }


@router.get("", response_model=List[QuotationRead])
async def list_quotations(
    organization_id: str,
    status: Optional[str] = Query(None, description="Filter by status (draft, issued, accepted, rejected, expired)"),
    search: Optional[str] = Query(None, description="Search by quotation number or client name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(
            Quotation,
            Project.name.label("project_name"),
            Client.name.label("client_name")
        )
        .join(Project, Quotation.project_id == Project.id)
        .outerjoin(Client, Quotation.client_id == Client.id)
        .where(Quotation.organization_id == organization_id)
        .order_by(Quotation.updated_at.desc())
    )

    if status and status.strip():
        query = query.where(Quotation.status == status.strip().lower())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Quotation.quotation_number.ilike(term),
                Project.name.ilike(term),
                Client.name.ilike(term)
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return [format_quotation_response(r[0], r[1], r[2]) for r in rows]


@router.post("", response_model=QuotationDetailRead, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    organization_id: str,
    req: QuotationCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    # Fetch estimate and ensure tenant isolation
    est_res = await db.execute(
        select(Estimate)
        .options(selectinload(Estimate.items), selectinload(Estimate.project))
        .where(and_(Estimate.id == req.estimate_id, Estimate.organization_id == organization_id))
    )
    estimate = est_res.scalars().first()
    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estimate not found or does not belong to this organization."
        )

    # Numbering
    q_num = req.quotation_number.strip() if req.quotation_number and req.quotation_number.strip() else await generate_unique_quotation_number(organization_id, db)

    # Check uniqueness
    existing_num = await db.execute(
        select(Quotation.id).where(
            and_(
                Quotation.organization_id == organization_id,
                Quotation.quotation_number == q_num
            )
        )
    )
    if existing_num.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation number '{q_num}' already exists in this organization."
        )

    # Use financial rates from request or inherit from estimate
    oh_pct = req.overhead_pct if req.overhead_pct is not None else estimate.overhead_pct
    cont_pct = req.contingency_pct if req.contingency_pct is not None else estimate.contingency_pct
    disc_pct = req.discount_pct if req.discount_pct is not None else estimate.discount_pct
    tax_configured = req.tax_configured if req.tax_configured is not None else False
    tax_rate = req.tax_rate if req.tax_rate is not None else Decimal("0.00")
    tax_name = req.tax_name or "GST"

    # Calculate exact totals
    items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in estimate.items]
    totals = calculate_estimate_totals(
        items_data,
        overhead_pct=oh_pct,
        contingency_pct=cont_pct,
        discount_pct=disc_pct,
        gst_pct=tax_rate if tax_configured else Decimal("0.00")
    )

    new_quotation = Quotation(
        organization_id=organization_id,
        estimate_id=estimate.id,
        project_id=estimate.project_id,
        client_id=estimate.project.client_id if estimate.project else None,
        quotation_number=q_num,
        status="draft",
        language=req.language or "en",
        issue_date=req.issue_date,
        valid_until_date=req.valid_until_date,
        payment_terms=req.payment_terms,
        exclusions=req.exclusions,
        notes=req.notes,
        client_instructions=req.client_instructions,
        authorized_signatory_name=req.authorized_signatory_name,
        authorized_signatory_designation=req.authorized_signatory_designation,
        tax_configured=tax_configured,
        tax_name=tax_name,
        tax_rate=tax_rate,
        subtotal=totals["subtotal"],
        overhead_pct=oh_pct,
        overhead_amount=totals["overhead_amount"],
        contingency_pct=cont_pct,
        contingency_amount=totals["contingency_amount"],
        discount_pct=disc_pct,
        discount_amount=totals["discount_amount"],
        taxable_amount=totals["taxable_amount"],
        tax_amount=totals["gst_amount"] if tax_configured else Decimal("0.00"),
        total_amount=totals["grand_total"] if tax_configured else totals["taxable_amount"],
        snapshot=None,
        created_by=current_user.id
    )

    # Concurrency-safe insert with retry on duplicate sequence collision
    is_custom_num = bool(req.quotation_number and req.quotation_number.strip())
    for attempt in range(5):
        if not is_custom_num and attempt > 0:
            new_quotation.quotation_number = await generate_unique_quotation_number(organization_id, db)
        try:
            db.add(new_quotation)
            await db.commit()
            await db.refresh(new_quotation)
            break
        except IntegrityError:
            await db.rollback()
            if is_custom_num:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Quotation number '{new_quotation.quotation_number}' already exists in this organization."
                )
            if attempt == 4:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate unique quotation number after multiple attempts."
                )

    return await get_quotation_details(new_quotation.id, organization_id, db)


async def get_quotation_details(
    quotation_id: str,
    organization_id: str,
    db: AsyncSession
) -> QuotationDetailRead:
    q_res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.project),
            selectinload(Quotation.client),
            selectinload(Quotation.estimate).selectinload(Estimate.items),
            selectinload(Quotation.organization)
        )
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    # If snapshot exists (issued / historical), reconstruct from immutable snapshot
    if quotation.snapshot:
        snap = quotation.snapshot
        items = snap.get("items") or []
        company_details = snap.get("company")
        client_details = snap.get("client")
        project_details = snap.get("project")
    else:
        # Live draft
        org = quotation.organization
        client = quotation.client
        proj = quotation.project
        items_db = quotation.estimate.items if quotation.estimate else []
        items = [
            {
                "item_number": it.item_number,
                "description": it.description,
                "category": it.category,
                "specification": it.notes or (it.calculation_details.get("formula") if it.calculation_details else None),
                "quantity": float(it.quantity),
                "unit": it.unit,
                "unit_rate": float(it.unit_rate),
                "amount": float(it.amount),
            }
            for it in items_db
        ]
        company_details = {
            "name": org.name if org else "",
            "owner_person": org.owner_person if org else "",
            "email": org.email if org else "",
            "phone": org.phone if org else "",
            "business_address": org.business_address if org else "",
            "city": org.city if org else "",
            "state": org.state if org else "",
            "pin_code": org.pin_code if org else "",
            "gstin": org.gstin if org else "",
            "logo_url": org.logo_url if org else None,
        } if org else {}
        client_details = {
            "name": client.name if client else "",
            "contact_person": client.contact_person if client else "",
            "email": client.email if client else "",
            "phone": client.phone if client else "",
            "billing_address": client.billing_address if client else "",
            "gstin": client.gstin if client else "",
        } if client else {}
        project_details = {
            "name": proj.name if proj else "",
            "project_type": proj.project_type if proj else "",
            "site_location": proj.site_location if proj else "",
            "city": proj.city if proj else "",
            "state": proj.state if proj else "",
            "reference_estimate_number": quotation.estimate.estimate_number if quotation.estimate else "",
        } if proj else {}

    base_read = format_quotation_response(
        quotation,
        quotation.project.name if quotation.project else None,
        quotation.client.name if quotation.client else None
    )

    return QuotationDetailRead(
        **base_read.model_dump(),
        payment_terms=quotation.payment_terms,
        exclusions=quotation.exclusions,
        notes=quotation.notes,
        client_instructions=quotation.client_instructions,
        authorized_signatory_name=quotation.authorized_signatory_name,
        authorized_signatory_designation=quotation.authorized_signatory_designation,
        overhead_pct=quotation.overhead_pct,
        contingency_pct=quotation.contingency_pct,
        discount_pct=quotation.discount_pct,
        snapshot=quotation.snapshot,
        items=items,
        company_details=company_details,
        client_details=client_details,
        project_details=project_details,
    )


@router.get("/{quotation_id}", response_model=QuotationDetailRead)
async def get_quotation(
    organization_id: str,
    quotation_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)
    return await get_quotation_details(quotation_id, organization_id, db)


@router.patch("/{quotation_id}", response_model=QuotationDetailRead)
async def update_quotation(
    organization_id: str,
    quotation_id: str,
    req: QuotationUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.estimate).selectinload(Estimate.items))
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    if quotation.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit quotation in '{quotation.status}' status. Only draft quotations can be edited."
        )

    # Update draft fields
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(quotation, field, val)

    # Recalculate totals
    items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in quotation.estimate.items]
    totals = calculate_estimate_totals(
        items_data,
        overhead_pct=quotation.overhead_pct,
        contingency_pct=quotation.contingency_pct,
        discount_pct=quotation.discount_pct,
        gst_pct=quotation.tax_rate if quotation.tax_configured else Decimal("0.00")
    )

    quotation.subtotal = totals["subtotal"]
    quotation.overhead_amount = totals["overhead_amount"]
    quotation.contingency_amount = totals["contingency_amount"]
    quotation.discount_amount = totals["discount_amount"]
    quotation.taxable_amount = totals["taxable_amount"]
    quotation.tax_amount = totals["gst_amount"] if quotation.tax_configured else Decimal("0.00")
    quotation.total_amount = totals["grand_total"] if quotation.tax_configured else totals["taxable_amount"]
    quotation.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(quotation)
    return await get_quotation_details(quotation.id, organization_id, db)


@router.post("/{quotation_id}/issue", response_model=QuotationDetailRead)
async def issue_quotation(
    organization_id: str,
    quotation_id: str,
    req: QuotationIssueRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Issues and finalizes a quotation:
    - Enforces explicit tax confirmation.
    - Captures an immutable frozen snapshot.
    - Transitions status from 'draft' to 'issued'.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.project),
            selectinload(Quotation.client),
            selectinload(Quotation.estimate).selectinload(Estimate.items),
            selectinload(Quotation.organization)
        )
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    if quotation.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation has already been issued (current status: '{quotation.status}'). Cannot re-issue."
        )

    # Explicit tax confirmation check
    if not quotation.tax_configured and not req.confirm_tax_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Applicable tax treatment has not been configured. You must confirm tax configuration before issuing."
        )

    if req.tax_rate is not None:
        quotation.tax_rate = req.tax_rate
        quotation.tax_configured = True
    if req.tax_name:
        quotation.tax_name = req.tax_name

    quotation.issue_date = req.issue_date or date.today()
    if req.valid_until_date:
        quotation.valid_until_date = req.valid_until_date

    # Recalculate final numbers
    items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in quotation.estimate.items]
    totals = calculate_estimate_totals(
        items_data,
        overhead_pct=quotation.overhead_pct,
        contingency_pct=quotation.contingency_pct,
        discount_pct=quotation.discount_pct,
        gst_pct=quotation.tax_rate if quotation.tax_configured else Decimal("0.00")
    )

    quotation.subtotal = totals["subtotal"]
    quotation.overhead_amount = totals["overhead_amount"]
    quotation.contingency_amount = totals["contingency_amount"]
    quotation.discount_amount = totals["discount_amount"]
    quotation.taxable_amount = totals["taxable_amount"]
    quotation.tax_amount = totals["gst_amount"] if quotation.tax_configured else Decimal("0.00")
    quotation.total_amount = totals["grand_total"] if quotation.tax_configured else totals["taxable_amount"]

    # Build IMMUTABLE frozen snapshot
    snapshot_payload = build_live_payload_from_quotation(
        quotation,
        quotation.organization,
        quotation.client,
        quotation.project,
        quotation.estimate.items
    )
    snapshot_payload["issued_at"] = datetime.now(timezone.utc).isoformat()
    snapshot_payload["issued_by_id"] = current_user.id
    snapshot_payload["issued_by_name"] = current_user.full_name

    quotation.status = "issued"
    quotation.snapshot = snapshot_payload
    quotation.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(quotation)

    return await get_quotation_details(quotation.id, organization_id, db)


@router.patch("/{quotation_id}/status", response_model=QuotationDetailRead)
async def update_quotation_status(
    organization_id: str,
    quotation_id: str,
    req: QuotationStatusUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    # Valid transitions:
    # 'issued' -> 'accepted', 'rejected', 'expired'
    if quotation.status != "issued":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition status from '{quotation.status}' to '{req.status}'. Only 'issued' quotations can be accepted, rejected, or expired."
        )

    quotation.status = req.status
    quotation.updated_at = datetime.now(timezone.utc)
    if quotation.snapshot and isinstance(quotation.snapshot, dict):
        # Update snapshot status field to preserve historical state
        updated_snap = dict(quotation.snapshot)
        updated_snap["status"] = req.status
        updated_snap[f"{req.status}_at"] = datetime.now(timezone.utc).isoformat()
        quotation.snapshot = updated_snap

    await db.commit()
    await db.refresh(quotation)

    return await get_quotation_details(quotation.id, organization_id, db)


@router.post("/{quotation_id}/duplicate", response_model=QuotationDetailRead, status_code=status.HTTP_201_CREATED)
async def duplicate_quotation(
    organization_id: str,
    quotation_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Duplicates an existing quotation (regardless of status) into a fresh DRAFT quotation
    with a new quotation number and clean snapshot.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    original = q_res.scalars().first()
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    new_num = await generate_unique_quotation_number(organization_id, db)

    dup = Quotation(
        organization_id=organization_id,
        estimate_id=original.estimate_id,
        project_id=original.project_id,
        client_id=original.client_id,
        quotation_number=new_num,
        status="draft",
        language=original.language,
        issue_date=None,
        valid_until_date=None,
        payment_terms=original.payment_terms,
        exclusions=original.exclusions,
        notes=original.notes,
        client_instructions=original.client_instructions,
        authorized_signatory_name=original.authorized_signatory_name,
        authorized_signatory_designation=original.authorized_signatory_designation,
        tax_configured=original.tax_configured,
        tax_name=original.tax_name,
        tax_rate=original.tax_rate,
        subtotal=original.subtotal,
        overhead_pct=original.overhead_pct,
        overhead_amount=original.overhead_amount,
        contingency_pct=original.contingency_pct,
        contingency_amount=original.contingency_amount,
        discount_pct=original.discount_pct,
        discount_amount=original.discount_amount,
        taxable_amount=original.taxable_amount,
        tax_amount=original.tax_amount,
        total_amount=original.total_amount,
        snapshot=None,
        created_by=current_user.id
    )

    for attempt in range(5):
        if attempt > 0:
            dup.quotation_number = await generate_unique_quotation_number(organization_id, db)
        try:
            db.add(dup)
            await db.commit()
            await db.refresh(dup)
            break
        except IntegrityError:
            await db.rollback()
            if attempt == 4:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to duplicate quotation under high concurrency."
                )

    return await get_quotation_details(dup.id, organization_id, db)


@router.get("/{quotation_id}/pdf")
async def download_quotation_pdf(
    organization_id: str,
    quotation_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.project),
            selectinload(Quotation.client),
            selectinload(Quotation.estimate).selectinload(Estimate.items),
            selectinload(Quotation.organization)
        )
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    if quotation.snapshot:
        payload = quotation.snapshot
    else:
        payload = build_live_payload_from_quotation(
            quotation,
            quotation.organization,
            quotation.client,
            quotation.project,
            quotation.estimate.items if quotation.estimate else []
        )

    try:
        pdf_bytes = generate_quotation_pdf(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quotation PDF: {str(e)}"
        )

    filename = f"{quotation.quotation_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
    )


@router.get("/{quotation_id}/excel")
async def export_quotation_excel(
    organization_id: str,
    quotation_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_org_membership(organization_id, current_user.id, db)

    q_res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.project),
            selectinload(Quotation.client),
            selectinload(Quotation.estimate).selectinload(Estimate.items),
            selectinload(Quotation.organization)
        )
        .where(and_(Quotation.id == quotation_id, Quotation.organization_id == organization_id))
    )
    quotation = q_res.scalars().first()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

    if quotation.snapshot:
        payload = quotation.snapshot
    else:
        payload = build_live_payload_from_quotation(
            quotation,
            quotation.organization,
            quotation.client,
            quotation.project,
            quotation.estimate.items if quotation.estimate else []
        )

    try:
        excel_bytes = generate_quotation_excel(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quotation Excel: {str(e)}"
        )

    filename = f"{quotation.quotation_number}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
    )
