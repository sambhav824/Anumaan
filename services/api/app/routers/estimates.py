from typing import List, Optional, Literal, Dict, Any
from decimal import Decimal
from datetime import datetime
import uuid
import random
import string
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership, verify_org_admin
from app.models.models import Estimate, BOQItem, Project, Profile
from app.schemas.estimate import (
    EstimateRead,
    EstimateDetailRead,
    EstimateCreate,
    EstimateUpdate,
    EstimateStatusUpdate,
    BOQItemCreate,
    BOQItemUpdate,
    BOQItemRead,
    CalculationRequest,
)
from app.core.calculations import (
    calculate_excavation,
    calculate_concrete,
    calculate_slab_concrete,
    calculate_brickwork,
    calculate_plaster,
    calculate_flooring,
    calculate_painting,
    calculate_reinforcement,
    calculate_road_layers,
    calculate_road_cross_sections,
    calculate_estimate_totals,
    quantize_currency,
    quantize_qty,
)

router = APIRouter(prefix="/api/organizations/{organization_id}/estimates", tags=["Estimates & BOQ"])


def enrich_estimate_detail(est: Estimate, proj_name: Optional[str] = None) -> EstimateDetailRead:
    """
    Enriches an estimate with loaded items and live monetary breakdown fields.
    """
    items_list = est.__dict__.get("items") or []
    items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in items_list]

    totals = calculate_estimate_totals(
        items_data,
        overhead_pct=est.overhead_pct,
        contingency_pct=est.contingency_pct,
        discount_pct=est.discount_pct,
        gst_pct=est.gst_pct,
    )

    items_read = [BOQItemRead.model_validate(it) for it in items_list]

    return EstimateDetailRead(
        id=est.id,
        organization_id=est.organization_id,
        project_id=est.project_id,
        project_name=proj_name or (est.project.name if getattr(est, "project", None) else None),
        project_type=est.category,
        estimate_number=est.estimate_number,
        name=est.name,
        category=est.category,
        status=est.status,
        overhead_pct=est.overhead_pct,
        contingency_pct=est.contingency_pct,
        discount_pct=est.discount_pct,
        gst_pct=est.gst_pct,
        notes=est.notes,
        subtotal=totals["subtotal"],
        overhead_amount=totals["overhead_amount"],
        contingency_amount=totals["contingency_amount"],
        discount_amount=totals["discount_amount"],
        pre_tax_subtotal=totals["taxable_amount"],
        taxable_amount=totals["taxable_amount"],
        gst_amount=totals["gst_amount"],
        total_amount=totals["grand_total"],
        item_count=len(items_read),
        items=items_read,
        snapshot=est.snapshot,
        created_by=est.created_by,
        created_at=est.created_at,
        updated_at=est.updated_at,
    )


def compute_estimate_summary(est: Estimate, proj_name: Optional[str], item_count: int) -> EstimateRead:
    subtotal = est.subtotal or Decimal("0.00")
    overhead = quantize_currency(subtotal * (est.overhead_pct / Decimal("100")))
    contingency = quantize_currency(subtotal * (est.contingency_pct / Decimal("100")))
    discount = quantize_currency(subtotal * (est.discount_pct / Decimal("100")))
    taxable = quantize_currency(subtotal + overhead + contingency - discount)
    gst = quantize_currency(taxable * (est.gst_pct / Decimal("100")))
    total = quantize_currency(taxable + gst)

    return EstimateRead(
        id=est.id,
        organization_id=est.organization_id,
        project_id=est.project_id,
        project_name=proj_name,
        project_type=est.category,
        estimate_number=est.estimate_number,
        name=est.name,
        category=est.category,
        status=est.status,
        overhead_pct=est.overhead_pct,
        contingency_pct=est.contingency_pct,
        discount_pct=est.discount_pct,
        gst_pct=est.gst_pct,
        notes=est.notes,
        subtotal=subtotal,
        overhead_amount=overhead,
        contingency_amount=contingency,
        discount_amount=discount,
        pre_tax_subtotal=taxable,
        taxable_amount=taxable,
        gst_amount=gst,
        total_amount=total,
        item_count=item_count,
        created_by=est.created_by,
        created_at=est.created_at,
        updated_at=est.updated_at,
    )

async def recalculate_and_save_estimate(estimate: Estimate, db: AsyncSession):
    """
    Recalculates an estimate's subtotal and grand total from its items,
    and updates the estimate record.
    """
    result = await db.execute(
        select(BOQItem)
        .where(BOQItem.estimate_id == estimate.id)
        .order_by(BOQItem.sort_order)
    )
    items = result.scalars().all()

    items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in items]
    totals = calculate_estimate_totals(
        items_data,
        overhead_pct=estimate.overhead_pct,
        contingency_pct=estimate.contingency_pct,
        discount_pct=estimate.discount_pct,
        gst_pct=estimate.gst_pct,
    )

    estimate.subtotal = totals["subtotal"]
    estimate.total_amount = totals["grand_total"]
    await db.commit()
    await db.refresh(estimate)
    return totals


@router.get("", response_model=List[EstimateRead])
async def list_estimates(
    organization_id: str,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    category: Optional[Literal["building", "road"]] = Query(None, description="Filter by category"),
    status: Optional[Literal["draft", "submitted", "approved", "archived"]] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or estimate number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists estimates strictly scoped to the user's organization.
    Supports filtering by project, category, status, and Unicode search.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(
            Estimate,
            Project.name.label("project_name"),
            func.count(BOQItem.id).label("item_count")
        )
        .join(Project, Estimate.project_id == Project.id)
        .outerjoin(BOQItem, Estimate.id == BOQItem.estimate_id)
        .where(Estimate.organization_id == organization_id)
        .group_by(Estimate.id, Project.name)
        .order_by(Estimate.updated_at.desc())
    )

    if project_id:
        query = query.where(Estimate.project_id == project_id)
    if category:
        query = query.where(Estimate.category == category)
    if status:
        query = query.where(Estimate.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Estimate.name.ilike(term),
                Estimate.estimate_number.ilike(term)
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    estimates = []
    for est, proj_name, cnt in rows:
        estimates.append(compute_estimate_summary(est, proj_name, cnt))

    return estimates


@router.post("", response_model=EstimateDetailRead, status_code=status.HTTP_201_CREATED)
async def create_estimate(
    organization_id: str,
    est_in: EstimateCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new estimate for a project in the user's organization.
    Optionally accepts initial BOQ items.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    # Verify project belongs to organization
    proj_res = await db.execute(
        select(Project).where(
            Project.id == est_in.project_id,
        )
    )
    project = proj_res.scalars().first()
    if not project or project.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected project does not belong to this organization."
        )

    # Determine or generate estimate_number
    if est_in.estimate_number and est_in.estimate_number.strip():
        est_number = est_in.estimate_number.strip()
    else:
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        est_number = f"EST-{datetime.now().strftime('%Y%m')}-{suffix}"

    # Check estimate_number uniqueness in organization
    dup_res = await db.execute(
        select(Estimate).where(
            Estimate.organization_id == organization_id,
            Estimate.estimate_number == est_number
        )
    )
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An estimate with number '{est_number}' already exists in this organization."
        )

    new_est = Estimate(
        organization_id=organization_id,
        project_id=est_in.project_id,
        estimate_number=est_number,
        name=est_in.name,
        category=est_in.category,
        overhead_pct=est_in.overhead_pct,
        contingency_pct=est_in.contingency_pct,
        discount_pct=est_in.discount_pct,
        gst_pct=est_in.gst_pct,
        notes=est_in.notes,
        created_by=current_user.id,
        status="draft",
        subtotal=Decimal("0.00"),
        total_amount=Decimal("0.00"),
    )
    db.add(new_est)
    await db.flush()

    if est_in.items:
        sort_idx = 0
        for item_in in est_in.items:
            amount = quantize_currency(item_in.quantity * item_in.unit_rate)
            boq = BOQItem(
                organization_id=organization_id,
                estimate_id=new_est.id,
                item_number=item_in.item_number,
                description=item_in.description,
                category=item_in.category,
                quantity=item_in.quantity,
                unit=item_in.unit,
                unit_rate=item_in.unit_rate,
                amount=amount,
                is_manual=item_in.is_manual,
                calculation_type=item_in.calculation_type,
                calculation_details=item_in.calculation_details,
                notes=item_in.notes,
                sort_order=sort_idx,
            )
            db.add(boq)
            sort_idx += 1
        await db.flush()

    await recalculate_and_save_estimate(new_est, db)

    # Fetch complete estimate with items
    detail_res = await db.execute(
        select(Estimate)
        .options(selectinload(Estimate.items))
        .where(Estimate.id == new_est.id)
    )
    created_est = detail_res.scalars().first()
    return enrich_estimate_detail(created_est, proj_name=project.name)


@router.get("/{estimate_id}", response_model=EstimateDetailRead)
async def get_estimate(
    organization_id: str,
    estimate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full estimate details including all child BOQ items.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(Estimate, Project.name.label("project_name"))
        .join(Project, Estimate.project_id == Project.id)
        .options(selectinload(Estimate.items))
        .where(
            Estimate.id == estimate_id,
            Estimate.organization_id == organization_id
        )
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Estimate not found.")

    est, proj_name = row
    return enrich_estimate_detail(est, proj_name=proj_name)


@router.patch("/{estimate_id}/status", response_model=EstimateDetailRead)
async def update_estimate_status(
    organization_id: str,
    estimate_id: str,
    status_in: EstimateStatusUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated endpoint to update status and preserve snapshot.
    """
    await verify_org_membership(organization_id, current_user.id, db)
    return await update_estimate(
        organization_id=organization_id,
        estimate_id=estimate_id,
        est_in=EstimateUpdate(status=status_in.status),
        current_user=current_user,
        db=db,
    )


@router.patch("/{estimate_id}", response_model=EstimateDetailRead)
async def update_estimate(
    organization_id: str,
    estimate_id: str,
    est_in: EstimateUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates estimate metadata, percentages, or status.
    When status becomes 'submitted' or 'approved', preserves a full historical snapshot.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(Estimate)
        .options(selectinload(Estimate.items))
        .where(
            Estimate.id == estimate_id,
            Estimate.organization_id == organization_id
        )
    )
    result = await db.execute(query)
    est = result.scalars().first()
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found.")

    # Update fields
    if est_in.name is not None:
        est.name = est_in.name
    if est_in.category is not None:
        est.category = est_in.category
    if est_in.overhead_pct is not None:
        est.overhead_pct = est_in.overhead_pct
    if est_in.contingency_pct is not None:
        est.contingency_pct = est_in.contingency_pct
    if est_in.discount_pct is not None:
        est.discount_pct = est_in.discount_pct
    if est_in.gst_pct is not None:
        est.gst_pct = est_in.gst_pct
    if est_in.notes is not None:
        est.notes = est_in.notes

    # Status transitions: preserve historical snapshot on submitted/approved
    if est_in.status is not None:
        old_status = est.status
        est.status = est_in.status
        if est_in.status in ("submitted", "approved") and old_status != est_in.status:
            items_snapshot = [
                {
                    "item_number": it.item_number,
                    "description": it.description,
                    "category": it.category,
                    "quantity": float(it.quantity),
                    "unit": it.unit,
                    "unit_rate": float(it.unit_rate),
                    "amount": float(it.amount),
                    "is_manual": it.is_manual,
                    "calculation_type": it.calculation_type,
                    "calculation_details": it.calculation_details,
                }
                for it in est.items
            ]
            est.snapshot = {
                "frozen_at": datetime.now().isoformat(),
                "status": est_in.status,
                "approved_by": current_user.id,
                "subtotal": float(est.subtotal),
                "total_amount": float(est.total_amount),
                "overhead_pct": float(est.overhead_pct),
                "contingency_pct": float(est.contingency_pct),
                "discount_pct": float(est.discount_pct),
                "gst_pct": float(est.gst_pct),
                "items": items_snapshot,
            }

    await recalculate_and_save_estimate(est, db)
    return await get_estimate(organization_id, estimate_id, current_user, db)


@router.delete("/{estimate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_estimate(
    organization_id: str,
    estimate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes an estimate and all its child BOQ items. Requires admin or owner role.
    """
    await verify_org_admin(organization_id, current_user.id, db)

    result = await db.execute(
        select(Estimate).where(
            Estimate.id == estimate_id,
            Estimate.organization_id == organization_id
        )
    )
    est = result.scalars().first()
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found.")

    await db.delete(est)
    await db.commit()


@router.post("/{estimate_id}/items", response_model=BOQItemRead, status_code=status.HTTP_201_CREATED)
async def add_boq_item(
    organization_id: str,
    estimate_id: str,
    item_in: BOQItemCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a single BOQ item to an estimate and recalculates estimate totals.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    est_res = await db.execute(
        select(Estimate).where(
            Estimate.id == estimate_id,
            Estimate.organization_id == organization_id
        )
    )
    est = est_res.scalars().first()
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found.")

    amount = quantize_currency(item_in.quantity * item_in.unit_rate)
    new_item = BOQItem(
        organization_id=organization_id,
        estimate_id=estimate_id,
        item_number=item_in.item_number,
        description=item_in.description,
        category=item_in.category,
        quantity=item_in.quantity,
        unit=item_in.unit,
        unit_rate=item_in.unit_rate,
        amount=amount,
        is_manual=item_in.is_manual,
        calculation_type=item_in.calculation_type,
        calculation_details=item_in.calculation_details,
        notes=item_in.notes,
        sort_order=item_in.sort_order,
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    await recalculate_and_save_estimate(est, db)
    return new_item


@router.put("/{estimate_id}/items", response_model=List[BOQItemRead])
async def save_boq_items(
    organization_id: str,
    estimate_id: str,
    items_in: List[BOQItemCreate],
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Replaces all BOQ items for an estimate transactionally.
    Performs deletion, insertion, and total recalculation in a single transaction.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    est_res = await db.execute(
        select(Estimate).where(
            Estimate.id == estimate_id,
            Estimate.organization_id == organization_id
        )
    )
    est = est_res.scalars().first()
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found.")

    try:
        # Delete existing items for this estimate
        existing_res = await db.execute(
            select(BOQItem).where(BOQItem.estimate_id == estimate_id)
        )
        for old_it in existing_res.scalars().all():
            await db.delete(old_it)

        created_items = []
        sort_idx = 0
        for item_in in items_in:
            amount = quantize_currency(item_in.quantity * item_in.unit_rate)
            boq = BOQItem(
                organization_id=organization_id,
                estimate_id=estimate_id,
                item_number=item_in.item_number,
                description=item_in.description,
                category=item_in.category,
                quantity=item_in.quantity,
                unit=item_in.unit,
                unit_rate=item_in.unit_rate,
                amount=amount,
                is_manual=item_in.is_manual,
                calculation_type=item_in.calculation_type,
                calculation_details=item_in.calculation_details,
                notes=item_in.notes,
                sort_order=item_in.sort_order if item_in.sort_order != 0 else sort_idx,
            )
            db.add(boq)
            created_items.append(boq)
            sort_idx += 1

        await db.flush()

        # Recalculate totals
        items_data = [{"quantity": it.quantity, "unit_rate": it.unit_rate} for it in created_items]
        totals = calculate_estimate_totals(
            items_data,
            overhead_pct=est.overhead_pct,
            contingency_pct=est.contingency_pct,
            discount_pct=est.discount_pct,
            gst_pct=est.gst_pct,
        )
        est.subtotal = totals["subtotal"]
        est.total_amount = totals["grand_total"]

        await db.commit()

        # Refresh items
        refreshed_res = await db.execute(
            select(BOQItem).where(BOQItem.estimate_id == estimate_id).order_by(BOQItem.sort_order)
        )
        return refreshed_res.scalars().all()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save BOQ items: {str(e)}")


@router.delete("/{estimate_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_boq_item(
    organization_id: str,
    estimate_id: str,
    item_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a single BOQ item and updates estimate totals.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(BOQItem).where(
            BOQItem.id == item_id,
            BOQItem.estimate_id == estimate_id,
            BOQItem.organization_id == organization_id
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ item not found.")

    await db.delete(item)
    await db.commit()

    est_res = await db.execute(select(Estimate).where(Estimate.id == estimate_id))
    est = est_res.scalars().first()
    if est:
        await recalculate_and_save_estimate(est, db)


@router.post("/calculate", response_model=Dict[str, Any])
async def live_calculate(
    organization_id: str,
    req: CalculationRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates any supported Indian construction calculation formula with input parameters
    and returns deterministic quantity, units, and breakdown formula.
    """
    await verify_org_membership(organization_id, current_user.id, db)
    ctype = (req.calculation_type or req.formula_type or "").lower().strip()
    # Support parameters either in req.params or at top level in req
    p: Dict[str, Any] = {}
    if req.params:
        p.update(req.params)
    for k, v in req.model_dump().items():
        if k not in ("calculation_type", "formula_type", "params") and v is not None:
            p.setdefault(k, v)

    input_unit = p.get("input_unit") or p.get("unit") or "m"

    try:
        if ctype == "excavation":
            return calculate_excavation(
                length=p["length"],
                width=p["width"],
                depth=p["depth"],
                unit=input_unit,
                swell_factor=p.get("swell_factor", Decimal("0.0")),
            )
        elif ctype == "concrete":
            return calculate_concrete(
                length=p["length"],
                width=p["width"],
                thickness=p["thickness"],
                unit=input_unit,
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "slab_concrete":
            return calculate_slab_concrete(
                area=p.get("area") or (p.get("length", 0) * p.get("width", 0)),
                thickness=p["thickness"],
                area_unit=p.get("area_unit") or ("sqm" if input_unit == "m" else "sqft"),
                thickness_unit=p.get("thickness_unit") or ("m" if input_unit == "m" else "ft"),
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "brickwork":
            return calculate_brickwork(
                length=p["length"],
                height=p["height"],
                thickness=p["thickness"],
                openings=p.get("openings"),
                unit=input_unit,
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "plaster":
            return calculate_plaster(
                length=p["length"],
                height=p["height"],
                sides=int(p.get("sides", 1)),
                openings=p.get("openings"),
                unit=input_unit,
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "flooring":
            return calculate_flooring(
                length=p.get("length"),
                width=p.get("width"),
                area=p.get("area") or p.get("floor_area"),
                unit=input_unit,
                area_unit=p.get("area_unit") or ("sqm" if input_unit == "m" else "sqft"),
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "painting":
            paint_area = p.get("area") or p.get("wall_area") or (p.get("length", 0) * p.get("height", 0))
            return calculate_painting(
                area=paint_area,
                coats=int(p.get("coats", 2)),
                coverage_per_unit=p.get("coverage_per_unit") or p.get("coverage_per_litre") or Decimal("10.0"),
                area_unit=p.get("area_unit") or ("sqm" if input_unit == "m" else "sqft"),
            )
        elif ctype in ("reinforcement", "steel"):
            bars = p.get("bars")
            if not bars:
                diameter = p.get("diameter_mm") or p.get("diameter")
                length = p.get("total_length_m") or p.get("length") or p.get("bar_length", 0)
                count = p.get("num_bars") or p.get("count") or 1
                bars = [{"diameter_mm": diameter, "length": length, "count": count}]
            return calculate_reinforcement(
                bars=bars,
                wastage_pct=p.get("wastage_pct", Decimal("0.0")),
            )
        elif ctype == "road_layers":
            return calculate_road_layers(
                length=p["length"],
                width=p["width"],
                compacted_thickness=p["compacted_thickness"],
                compaction_factor=p.get("compaction_factor", Decimal("1.0")),
                unit=input_unit,
            )
        elif ctype == "road_cross_sections":
            area1 = p.get("area1")
            area2 = p.get("area2")
            distance = p.get("distance")
            if (area1 is None or area2 is None) and "sections" in p:
                secs = p["sections"]
                if len(secs) >= 2:
                    area1 = secs[0].get("area") if isinstance(secs[0], dict) else secs[0]
                    area2 = secs[1].get("area") if isinstance(secs[1], dict) else secs[1]
                    distance = distance or p.get("total_distance") or (secs[1].get("chainage", 0) - secs[0].get("chainage", 0))
            return calculate_road_cross_sections(
                area1=area1,
                area2=area2,
                distance=distance,
                area_unit=p.get("area_unit", "sqm"),
                distance_unit=p.get("distance_unit", "m"),
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown calculation formula type: '{ctype}'"
            )
    except KeyError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required parameter for {ctype} calculation: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
