from typing import List, Optional, Literal, Dict, Any
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, update

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership
from app.models.models import RateItem, Profile, BOQItem, Organization
from app.schemas.rates import (
    RateItemRead,
    RateItemCreate,
    RateItemUpdate,
    SeedDefaultRatesRequest,
    RegionInfo,
)
from app.core.default_rates import (
    get_default_catalogue,
    get_supported_regions,
    find_default_item_by_code,
    SUPPORTED_REGIONS,
    DEFAULT_RATE_CATALOG_ITEMS,
    MATERIAL_GROUPS,
)

# Global router for general rate catalogue & regions
global_rates_router = APIRouter(prefix="/api/rates", tags=["Rate Library Catalogue"])

# Organization-scoped router
router = APIRouter(prefix="/api/organizations/{organization_id}/rates", tags=["Rate Library"])


# -----------------------------------------------------------------------------
# Global Catalogue Endpoints
# -----------------------------------------------------------------------------

@global_rates_router.get("/regions", response_model=List[RegionInfo])
async def list_regions():
    """
    Returns list of supported Indian regional benchmark rate sources (e.g. CPWD DSR, Maharashtra PWD, Karnataka PWD).
    """
    return get_supported_regions()


@global_rates_router.get("/material-groups", response_model=List[Dict[str, str]])
async def list_material_groups():
    """
    Returns core canonical material categories (A to I: Cement, Sand, Steel, Masonry, Chemicals, Finishing, Plumbing, Electrical, Other).
    """
    return MATERIAL_GROUPS


@global_rates_router.get("/catalogue", response_model=List[Dict[str, Any]])
async def get_catalogue(
    region: str = Query("national_cpwd", description="Region benchmark (national_cpwd, maharashtra_pwd, karnataka_pwd)"),
    category: Optional[str] = Query(None, description="Category filter"),
    material_group: Optional[str] = Query(None, description="Material group filter"),
    search: Optional[str] = Query(None, description="Search term across name, code, specification")
):
    """
    Returns pre-populated default rate catalogue items for reference and manual browsing.
    Strictly construction materials only (zero labour rates).
    """
    return get_default_catalogue(region=region, category=category, material_group=material_group, search=search)


# -----------------------------------------------------------------------------
# Organization Rate Library Endpoints
# -----------------------------------------------------------------------------

@router.get("/regions", response_model=List[RegionInfo])
async def list_org_regions(
    organization_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns supported regional benchmark sources."""
    await verify_org_membership(organization_id, current_user.id, db)
    return get_supported_regions()


@router.get("/catalogue", response_model=List[Dict[str, Any]])
async def get_org_catalogue(
    organization_id: str,
    region: str = Query("national_cpwd", description="Region benchmark"),
    category: Optional[str] = Query(None),
    material_group: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns default rate catalogue items for organization users. Strictly materials only."""
    await verify_org_membership(organization_id, current_user.id, db)
    return get_default_catalogue(region=region, category=category, material_group=material_group, search=search)


@router.post("/seed-defaults", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def seed_defaults(
    organization_id: str,
    request: SeedDefaultRatesRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Pre-populates or updates the organization's rate library from the default catalogue for the chosen region.
    Strictly seeds construction materials only.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    region = request.region if request.region in SUPPORTED_REGIONS else "national_cpwd"
    catalogue_items = get_default_catalogue(region=region)

    # Fetch existing items in org
    existing_res = await db.execute(
        select(RateItem).where(RateItem.organization_id == organization_id)
    )
    existing_items = existing_res.scalars().all()
    existing_by_default_id = {item.default_item_id: item for item in existing_items if item.default_item_id}
    existing_by_code = {item.code: item for item in existing_items if item.code}

    seeded_count = 0
    updated_count = 0

    for cat_item in catalogue_items:
        code = cat_item["code"]
        existing = existing_by_default_id.get(code) or existing_by_code.get(code)

        if existing:
            # If user customized this item and overwrite_custom is False, skip
            if existing.is_custom and not request.overwrite_custom:
                continue

            existing.material_rate = cat_item["material_rate"]
            existing.labour_rate = cat_item["labour_rate"]
            existing.equipment_rate = cat_item["equipment_rate"]
            existing.combined_rate = cat_item["combined_rate"]
            existing.unit = cat_item["unit"]
            existing.category = cat_item["category"]
            existing.rate_type = cat_item["rate_type"]
            existing.rate_source = cat_item["rate_source"]
            existing.supplier_or_source_name = cat_item["supplier_or_source_name"]
            existing.source_date = cat_item["source_date"]
            existing.rate_status = cat_item["rate_status"]
            existing.specification = cat_item["specification"]
            existing.region = cat_item["region"]
            existing.description = cat_item["description"]
            existing.notes = cat_item["notes"]
            existing.is_custom = False
            existing.is_archived = False
            existing.default_item_id = code
            updated_count += 1
        else:
            new_item = RateItem(
                organization_id=organization_id,
                code=code,
                name=cat_item["name"],
                category=cat_item["category"],
                rate_type=cat_item["rate_type"],
                unit=cat_item["unit"],
                material_rate=cat_item["material_rate"],
                labour_rate=cat_item["labour_rate"],
                equipment_rate=cat_item["equipment_rate"],
                combined_rate=cat_item["combined_rate"],
                rate_source=cat_item["rate_source"],
                supplier_or_source_name=cat_item["supplier_or_source_name"],
                source_date=cat_item["source_date"],
                rate_status=cat_item["rate_status"],
                specification=cat_item["specification"],
                description=cat_item["description"],
                region=cat_item["region"],
                notes=cat_item["notes"],
                is_custom=False,
                is_archived=False,
                default_item_id=code,
                created_by=current_user.id,
            )
            db.add(new_item)
            seeded_count += 1

    await db.commit()
    return {
        "message": f"Successfully synced construction material rates for {SUPPORTED_REGIONS[region]['name']}.",
        "region": region,
        "region_name": SUPPORTED_REGIONS[region]["name"],
        "seeded_count": seeded_count,
        "updated_count": updated_count,
        "total_catalogue_items": len(catalogue_items),
    }


@router.post("/reconcile-and-deduplicate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def reconcile_and_deduplicate(
    organization_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Idempotent Rate Library Cleanup & Reconciliation:
    1. Archives all labour entries from the material Rate Library (preserving historical DB records).
    2. Merges duplicate product entries and updates any referencing BOQItems.
    3. Seeds any missing core canonical construction materials for the organization's region.
    4. Returns a detailed audit report.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    org_res = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_res.scalars().first()
    org_region = "maharashtra_pwd" if org and "maharashtra" in (org.state or "").lower() else "national_cpwd"

    res = await db.execute(select(RateItem).where(RateItem.organization_id == organization_id))
    items = res.scalars().all()
    total_before = len(items)

    labour_archived = 0
    duplicates_merged = 0
    actions_log = []

    # 1. Archive Labour Items (Exclude from material catalog, keep record for historical quotes)
    for it in items:
        if it.category == "labour" or it.rate_type == "labour_only":
            if not it.is_archived:
                it.is_archived = True
                labour_archived += 1
                actions_log.append(f"Archived labour entry: '{it.name}' ({it.code})")

    # 2. Merge Duplicate Products
    active_items = [it for it in items if not it.is_archived and it.category != "labour"]
    groups: Dict[str, List[RateItem]] = {}

    for it in active_items:
        if it.code and it.code.strip():
            key = f"code:{it.code.strip().upper()}"
        else:
            norm_name = re.sub(r'[\(\)\[\]\-\_\,\.]', ' ', it.name.lower()).strip()
            norm_name = re.sub(r'\s+', ' ', norm_name)
            key = f"name_unit:{norm_name}::{it.unit.strip().lower()}"
        groups.setdefault(key, []).append(it)

    for key, group in groups.items():
        if len(group) > 1:
            # Pick canonical
            canonical = sorted(
                group,
                key=lambda x: (
                    0 if x.rate_status == "verified_source" else 1,
                    0 if not x.is_custom else 1,
                    x.created_at
                )
            )[0]

            duplicates = [x for x in group if x.id != canonical.id]
            for dup in duplicates:
                dup.is_archived = True
                dup.canonical_id = canonical.id
                duplicates_merged += 1

                # Re-link any BOQItems pointing to duplicate
                await db.execute(
                    update(BOQItem)
                    .where(BOQItem.rate_item_id == dup.id)
                    .values(rate_item_id=canonical.id)
                )
                actions_log.append(f"Merged duplicate '{dup.name}' into canonical '{canonical.name}'")

    # 3. Seed missing canonical core items
    seeded_count = 0
    current_active_codes = {it.code for it in active_items if it.code}
    for cat_item in DEFAULT_RATE_CATALOG_ITEMS:
        code = cat_item["code"]
        if code not in current_active_codes:
            reg_rate = cat_item.get("regional_rates", {}).get(org_region, {})
            mat_rate = reg_rate.get("material", cat_item.get("regional_rates", {}).get("national_cpwd", {}).get("material", 0))

            new_it = RateItem(
                organization_id=organization_id,
                code=code,
                name=cat_item["name"],
                category="material",
                rate_type="raw_material",
                unit=cat_item["unit"],
                material_rate=mat_rate,
                labour_rate=0,
                equipment_rate=0,
                combined_rate=mat_rate,
                rate_source=cat_item.get("rate_source", "Schedule of Rates"),
                supplier_or_source_name=cat_item.get("supplier_or_source_name"),
                source_date=cat_item.get("source_date", "2023-2024"),
                rate_status=cat_item.get("rate_status", "verified_source"),
                specification=cat_item.get("specification"),
                description=cat_item.get("description"),
                region=org_region,
                is_custom=False,
                is_archived=False,
                default_item_id=code,
            )
            db.add(new_it)
            seeded_count += 1
            actions_log.append(f"Seeded canonical material: '{cat_item['name']}' ({code})")

    await db.commit()

    # Query final active count
    res_final = await db.execute(
        select(RateItem).where(
            and_(
                RateItem.organization_id == organization_id,
                RateItem.is_archived == False,
                RateItem.category == "material"
            )
        )
    )
    final_active = len(res_final.scalars().all())

    return {
        "status": "success",
        "organization_id": organization_id,
        "region": org_region,
        "total_before": total_before,
        "canonical_active_materials": final_active,
        "labour_archived": labour_archived,
        "duplicates_merged": duplicates_merged,
        "seeded_canonical": seeded_count,
        "actions_log": actions_log,
    }


@router.post("/{rate_id}/reset-to-default", response_model=RateItemRead)
async def reset_rate_to_default(
    organization_id: str,
    rate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resets an organization's customized rate back to its original default catalogue rates
    and resets is_custom to False.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(RateItem).where(RateItem.id == rate_id, RateItem.organization_id == organization_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate item not found")

    code_to_find = item.default_item_id or item.code
    if not code_to_find:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This rate item is a contractor-created custom item and has no default catalogue reference to reset to."
        )

    default_entry = find_default_item_by_code(code_to_find, region=item.region or "national_cpwd")
    if not default_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Default catalogue item '{code_to_find}' could not be found."
        )

    # Reset values to default
    item.material_rate = default_entry["material_rate"]
    item.labour_rate = default_entry["labour_rate"]
    item.equipment_rate = default_entry["equipment_rate"]
    item.combined_rate = default_entry["combined_rate"]
    item.unit = default_entry["unit"]
    item.category = default_entry["category"]
    item.rate_type = default_entry["rate_type"]
    item.rate_source = default_entry["rate_source"]
    item.supplier_or_source_name = default_entry["supplier_or_source_name"]
    item.source_date = default_entry["source_date"]
    item.rate_status = default_entry["rate_status"]
    item.specification = default_entry["specification"]
    item.description = default_entry["description"]
    item.is_custom = False
    item.is_archived = False

    await db.commit()
    await db.refresh(item)
    return item


@router.get("", response_model=List[RateItemRead])
async def list_rate_items(
    organization_id: str,
    search: Optional[str] = Query(None, description="Search by item name, description, supplier, or notes"),
    category: Optional[str] = Query(None, description="Filter by category"),
    region: Optional[str] = Query(None, description="Filter by region"),
    rate_type: Optional[str] = Query(None, description="Filter by rate type"),
    is_custom: Optional[bool] = Query(None, description="Filter by custom vs default"),
    rate_status: Optional[str] = Query(None, description="Filter by verified vs illustrative"),
    include_archived: bool = Query(False, description="Whether to include archived/merged items"),
    include_labour: bool = Query(False, description="Whether to include labour rates (False by default for Material Rate Library)"),
    sort_by: Literal["name", "updated_at", "created_at", "code"] = Query("name", description="Field to sort by"),
    order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists reusable rate items belonging strictly to the specified organization.
    Multi-tenant isolation enforced. Strictly filters to construction materials by default.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = select(RateItem).where(RateItem.organization_id == organization_id)

    # Filter out archived items unless explicitly requested
    if not include_archived:
        query = query.where(RateItem.is_archived == False)

    # Strictly exclude labour from the Rate Library by default
    if not include_labour:
        query = query.where(RateItem.category != "labour").where(RateItem.rate_type != "labour_only")

    if category and category.strip() and category.strip().lower() != "all":
        query = query.where(RateItem.category == category.strip().lower())

    if region and region.strip() and region.strip().lower() != "all":
        query = query.where(RateItem.region == region.strip())

    if rate_type and rate_type.strip() and rate_type.strip().lower() != "all":
        query = query.where(RateItem.rate_type == rate_type.strip())

    if is_custom is not None:
        query = query.where(RateItem.is_custom == is_custom)

    if rate_status and rate_status.strip():
        query = query.where(RateItem.rate_status == rate_status.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                RateItem.name.ilike(term),
                RateItem.code.ilike(term),
                RateItem.description.ilike(term),
                RateItem.specification.ilike(term),
                RateItem.supplier_or_source_name.ilike(term),
                RateItem.location.ilike(term),
                RateItem.supplier_or_location.ilike(term),
                RateItem.notes.ilike(term),
            )
        )

    # Sorting
    sort_col = getattr(RateItem, sort_by, RateItem.name)
    query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=RateItemRead, status_code=status.HTTP_201_CREATED)
async def create_rate_item(
    organization_id: str,
    item_in: RateItemCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new contractor rate library item in the organization.
    User-created items are tagged with is_custom = True unless specified.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    mat = item_in.material_rate
    lab = item_in.labour_rate
    eq = item_in.equipment_rate
    comb = item_in.combined_rate

    # If combined rate not explicitly provided, calculate sum
    if comb == 0 and (mat > 0 or lab > 0 or eq > 0):
        comb = mat + lab + eq

    loc = item_in.location or item_in.supplier_or_location
    src_name = item_in.supplier_or_source_name

    rate_item = RateItem(
        organization_id=organization_id,
        code=item_in.code,
        name=item_in.name,
        category=item_in.category,
        rate_type=item_in.rate_type,
        description=item_in.description,
        unit=item_in.unit,
        material_rate=mat,
        labour_rate=lab,
        equipment_rate=eq,
        combined_rate=comb,
        rate_source=item_in.rate_source,
        supplier_or_source_name=src_name,
        location=loc,
        supplier_or_location=loc or src_name,
        region=item_in.region,
        source_date=item_in.source_date,
        rate_status=item_in.rate_status,
        specification=item_in.specification,
        is_custom=True if item_in.is_custom is None else item_in.is_custom,
        is_archived=item_in.is_archived,
        canonical_id=item_in.canonical_id,
        default_item_id=item_in.default_item_id,
        notes=item_in.notes,
        created_by=current_user.id,
    )
    db.add(rate_item)
    await db.commit()
    await db.refresh(rate_item)
    return rate_item


@router.get("/{rate_id}", response_model=RateItemRead)
async def get_rate_item(
    organization_id: str,
    rate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gets a single rate item by ID within the organization.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(RateItem).where(RateItem.id == rate_id, RateItem.organization_id == organization_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate item not found")
    return item


@router.put("/{rate_id}", response_model=RateItemRead)
@router.patch("/{rate_id}", response_model=RateItemRead)
async def update_rate_item(
    organization_id: str,
    rate_id: str,
    item_in: RateItemUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates an existing rate item. Marking rates as customized (is_custom = True).
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(RateItem).where(RateItem.id == rate_id, RateItem.organization_id == organization_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate item not found")

    update_data = item_in.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        setattr(item, field, val)

    # Recalculate combined rate if not explicitly supplied and components changed
    if "combined_rate" not in update_data and (
        "material_rate" in update_data or "labour_rate" in update_data or "equipment_rate" in update_data
    ):
        item.combined_rate = item.material_rate + item.labour_rate + item.equipment_rate

    # If user changed rates or fields, automatically tag as customized unless explicitly set
    if "is_custom" not in update_data:
        item.is_custom = True

    # Sync supplier/location fields if either is provided
    if "location" in update_data and not update_data.get("supplier_or_location"):
        item.supplier_or_location = item.location
    if "supplier_or_location" in update_data and not update_data.get("location"):
        item.location = item.supplier_or_location

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rate_item(
    organization_id: str,
    rate_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes or archives a rate item from the library.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(RateItem).where(RateItem.id == rate_id, RateItem.organization_id == organization_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate item not found")

    # Check if referenced by existing BOQ items
    boq_res = await db.execute(select(BOQItem).where(BOQItem.rate_item_id == rate_id))
    if boq_res.scalars().first():
        # Soft delete / archive to preserve historical estimates
        item.is_archived = True
        await db.commit()
        return None

    await db.delete(item)
    await db.commit()
    return None
