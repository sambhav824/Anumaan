import sys
import asyncio
import re

sys.path.insert(0, 'services/api')
from app.core.database import AsyncSessionLocal, init_db
from app.models.models import RateItem, BOQItem, Organization
from app.core.default_rates import DEFAULT_RATE_CATALOG_ITEMS
from sqlalchemy import select, update, and_


def normalize_str(s: str) -> str:
    if not s:
        return ""
    # Remove extra spaces, lowercase, remove punctuation differences
    s = s.strip().lower()
    s = re.sub(r'[\(\)\[\]\-\_\,\.]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


async def reconcile_rates_for_org(session, org_id: str, org_region: str = "national_cpwd"):
    res = await session.execute(
        select(RateItem).where(RateItem.organization_id == org_id)
    )
    items = res.scalars().all()
    total_before = len(items)

    labour_archived = 0
    duplicates_merged = 0
    actions_log = []

    # 1. Archive Labour Items (Keep record for historical estimates, exclude from Rate Library)
    for it in items:
        if it.category == "labour" or it.rate_type == "labour_only":
            if not it.is_archived:
                it.is_archived = True
                labour_archived += 1
                actions_log.append(f"Archived labour entry: '{it.name}' ({it.code})")

    # 2. Identify & Merge Duplicates
    # Group active non-labour items by code and normalized name + unit
    active_items = [it for it in items if not it.is_archived and it.category != "labour"]
    groups = {}

    for it in active_items:
        key = None
        if it.code and it.code.strip():
            key = f"code:{it.code.strip().upper()}"
        else:
            norm_name = normalize_str(it.name)
            norm_unit = it.unit.strip().lower()
            key = f"name_unit:{norm_name}::{norm_unit}"

        groups.setdefault(key, []).append(it)

    for key, group in groups.items():
        if len(group) > 1:
            # Pick canonical: prefer verified_source, non-custom, or earliest
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
                await session.execute(
                    update(BOQItem)
                    .where(BOQItem.rate_item_id == dup.id)
                    .values(rate_item_id=canonical.id)
                )
                actions_log.append(f"Merged duplicate '{dup.name}' ({dup.id}) into canonical '{canonical.name}' ({canonical.id})")

    # 3. Seed any missing core canonical materials from default catalog
    seeded_count = 0
    current_active_codes = {it.code for it in active_items if it.code}
    for cat_item in DEFAULT_RATE_CATALOG_ITEMS:
        code = cat_item["code"]
        if code not in current_active_codes:
            reg_rate = cat_item.get("regional_rates", {}).get(org_region, {})
            mat_rate = reg_rate.get("material", cat_item.get("regional_rates", {}).get("national_cpwd", {}).get("material", 0))

            new_it = RateItem(
                organization_id=org_id,
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
            session.add(new_it)
            seeded_count += 1
            actions_log.append(f"Seeded canonical core material: '{cat_item['name']}' ({code})")

    await session.commit()

    # Re-count active items
    res_final = await session.execute(
        select(RateItem).where(
            and_(
                RateItem.organization_id == org_id,
                RateItem.is_archived == False,
                RateItem.category == "material"
            )
        )
    )
    final_active = len(res_final.scalars().all())

    return {
        "organization_id": org_id,
        "total_before": total_before,
        "canonical_active_materials": final_active,
        "labour_archived": labour_archived,
        "duplicates_merged": duplicates_merged,
        "seeded_canonical": seeded_count,
        "actions_log": actions_log,
    }


async def main():
    await init_db()
    async with AsyncSessionLocal() as session:
        orgs_res = await session.execute(select(Organization))
        orgs = orgs_res.scalars().all()
        print(f"Found {len(orgs)} organizations in DB.")

        total_report = []
        for org in orgs:
            reg = "maharashtra_pwd" if "maharashtra" in (org.state or "").lower() else "national_cpwd"
            rep = await reconcile_rates_for_org(session, org.id, org_region=reg)
            total_report.append(rep)
            safe_name = org.name.encode('ascii', 'replace').decode('ascii')
            print(f"Org '{safe_name}' ({org.id}): Before={rep['total_before']}, Active Canonical Materials={rep['canonical_active_materials']}, Labour Archived={rep['labour_archived']}, Duplicates Merged={rep['duplicates_merged']}")

        print("\nReconciliation completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())

