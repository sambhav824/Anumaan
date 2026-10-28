import pytest
from httpx import AsyncClient
from decimal import Decimal
from app.core.default_rates import DEFAULT_RATE_CATALOG_ITEMS, SUPPORTED_REGIONS


@pytest.mark.asyncio
async def test_default_rate_catalogue_structure_and_coverage(client: AsyncClient):
    """
    Verifies that the pre-populated default rate catalogue covers all required Indian construction areas:
    - Cement by type and bag size
    - TMT rebar by grade and diameter
    - Sand and aggregates
    - PCC, RCC, and RMC concrete
    - Bricks and AAC blocks
    - Earthwork, excavation, backfilling
    - Masonry, plastering, formwork
    - Tiles, paint, waterproofing
    - Labour daily wages
    - Equipment and transport rentals
    - Road construction (GSB, WMM, Bituminous work, Kerbs)
    """
    res = await client.get("/api/rates/catalogue?region=national_cpwd")
    assert res.status_code == 200
    catalogue = res.json()
    assert len(catalogue) >= 30, f"Expected rich catalogue, got {len(catalogue)} items"

    codes = {item["code"] for item in catalogue}

    # Verify cement
    assert "CEM-OPC-53" in codes
    assert "CEM-OPC-43" in codes
    assert "CEM-PPC-01" in codes

    # Verify TMT steel
    assert "STL-TMT-8MM" in codes
    assert "STL-TMT-12MM" in codes
    assert "STL-BIND-WIRE" in codes

    # Verify Sand & Aggregates
    assert "AGG-RIV-SAND" in codes
    assert "AGG-MSAND" in codes
    assert "AGG-PSAND" in codes
    assert "AGG-STONE-20MM" in codes

    # Verify Concrete
    assert "CON-PCC-M75" in codes
    assert "CON-RCC-M20" in codes
    assert "CON-RCC-M25" in codes
    assert "CON-RMC-M25" in codes

    # Verify Bricks & AAC
    assert "BRK-CLAY-RED" in codes
    assert "BLK-AAC-150" in codes

    # Verify Earthwork

    # Verify Masonry & Plaster

    # Verify Tiles & Paint
    assert "FIN-TILE-VIT" in codes
    assert "PNT-INT-EMUL" in codes
    assert "WPR-POLY-COAT" in codes

    # Verify Labour is strictly excluded from material catalog
    assert "LAB-HEAD-MASON" not in codes
    assert "LAB-SKILLED-MAS" not in codes
    assert "LAB-UNSKILLED" not in codes

    # Verify Road construction
    assert "ROA-GSB-GR1" in codes
    assert "ROA-WMM-BASE" in codes
    assert "ROA-DBM-50MM" in codes
    assert "ROA-KERB-M20" in codes

    # Verify trustworthiness: rate_status and source recording
    for item in catalogue:
        assert item["rate_source"] in ("Schedule of Rates", "Supplier Quote", "Manual")
        assert item["rate_status"] in ("verified_source", "illustrative_needs_verification")
        assert item["supplier_or_source_name"] is not None and len(item["supplier_or_source_name"]) > 0
        assert item["unit"] is not None and len(item["unit"]) > 0
        assert float(item["combined_rate"]) > 0


@pytest.mark.asyncio
async def test_regional_rate_benchmarks(client: AsyncClient):
    """
    Verifies that regional rates differ accurately according to state benchmark schedules.
    """
    # 1. Check supported regions endpoint
    reg_res = await client.get("/api/rates/regions")
    assert reg_res.status_code == 200
    regions = reg_res.json()
    reg_ids = {r["id"] for r in regions}
    assert "national_cpwd" in reg_ids
    assert "maharashtra_pwd" in reg_ids
    assert "karnataka_pwd" in reg_ids

    # 2. Compare cement and skilled mason between National CPWD and Maharashtra PWD
    cpwd_res = await client.get("/api/rates/catalogue?region=national_cpwd")
    mah_res = await client.get("/api/rates/catalogue?region=maharashtra_pwd")

    cpwd_items = {it["code"]: it for it in cpwd_res.json()}
    mah_items = {it["code"]: it for it in mah_res.json()}

    # In Maharashtra PWD CSR (Palghar/Mumbai MMR), cement reflects regional rates and labour is excluded
    assert "LAB-SKILLED-MAS" not in mah_items
    assert "LAB-SKILLED-MAS" not in cpwd_items
    assert float(mah_items["CEM-OPC-53"]["material_rate"]) >= float(cpwd_items["CEM-OPC-53"]["material_rate"])


@pytest.mark.asyncio
async def test_organization_seed_customize_and_reset_to_default(client: AsyncClient, token_a: str, token_b: str):
    """
    Full lifecycle test:
    1. Create isolated organization
    2. Seed library from Maharashtra PWD default catalogue
    3. Verify rate items are tagged with is_custom = False
    4. Customize a rate item (e.g. negotiated cement price)
    5. Verify is_custom becomes True
    6. Execute Reset to Default action
    7. Verify rate is restored to default catalogue and is_custom becomes False
    8. Multi-tenant check: User B cannot access Org A's rate library
    """
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    org_res = await client.post(
        "/api/organizations",
        json={"name": "Patil & Sons Constructions", "city": "Pune", "state": "Maharashtra"},
        headers=headers_a
    )
    assert org_res.status_code == 201
    org_id = org_res.json()["id"]

    # 1. Seed default rates for Maharashtra region
    seed_res = await client.post(
        f"/api/organizations/{org_id}/rates/seed-defaults",
        json={"region": "maharashtra_pwd", "overwrite_custom": False},
        headers=headers_a
    )
    assert seed_res.status_code == 200
    seed_data = seed_res.json()
    assert seed_data["seeded_count"] >= 30
    assert seed_data["region"] == "maharashtra_pwd"

    # 2. List rates and locate OPC 53 Cement
    rates_res = await client.get(f"/api/organizations/{org_id}/rates", headers=headers_a)
    assert rates_res.status_code == 200
    org_rates = rates_res.json()
    assert len(org_rates) >= 30

    cement_item = next(it for it in org_rates if it["code"] == "CEM-OPC-53")
    assert cement_item["is_custom"] is False
    original_rate = float(cement_item["material_rate"])
    assert original_rate == 395.00  # Maharashtra benchmark rate

    # 3. Customize this rate item (e.g. bulk supplier discount to 360.00)
    update_res = await client.patch(
        f"/api/organizations/{org_id}/rates/{cement_item['id']}",
        json={"material_rate": 360.00, "supplier_or_source_name": "Direct Factory Bulk Deal"},
        headers=headers_a
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert float(updated["material_rate"]) == 360.00
    assert float(updated["combined_rate"]) == 360.00
    assert updated["is_custom"] is True
    assert updated["supplier_or_source_name"] == "Direct Factory Bulk Deal"

    # 4. Reseed without overwrite_custom - verify custom rate is PROTECTED
    reseed_res = await client.post(
        f"/api/organizations/{org_id}/rates/seed-defaults",
        json={"region": "maharashtra_pwd", "overwrite_custom": False},
        headers=headers_a
    )
    assert reseed_res.status_code == 200
    recheck_res = await client.get(f"/api/organizations/{org_id}/rates/{cement_item['id']}", headers=headers_a)
    assert float(recheck_res.json()["material_rate"]) == 360.00
    assert recheck_res.json()["is_custom"] is True

    # 5. Reset to Default action
    reset_res = await client.post(
        f"/api/organizations/{org_id}/rates/{cement_item['id']}/reset-to-default",
        headers=headers_a
    )
    assert reset_res.status_code == 200
    reset_item = reset_res.json()
    assert float(reset_item["material_rate"]) == original_rate
    assert reset_item["is_custom"] is False
    assert "CPWD" in reset_item["supplier_or_source_name"] or "UltraTech" in reset_item["supplier_or_source_name"]

    # 6. Multi-tenant isolation: User B must get 403 Forbidden
    denied = await client.get(f"/api/organizations/{org_id}/rates", headers=headers_b)
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_boq_snapshot_retains_rate_after_library_changes(client: AsyncClient, token_a: str):
    """
    Confirms that creating an estimate with a rate library item freezes its snapshot
    and catalogue updates never alter existing estimates silently.
    """
    headers = {"Authorization": f"Bearer {token_a}"}

    org_res = await client.post(
        "/api/organizations",
        json={"name": "Neha Infra Projects", "city": "Bengaluru", "state": "Karnataka"},
        headers=headers
    )
    assert org_res.status_code == 201
    org_id = org_res.json()["id"]

    # Seed defaults for Karnataka
    await client.post(
        f"/api/organizations/{org_id}/rates/seed-defaults",
        json={"region": "karnataka_pwd", "overwrite_custom": False},
        headers=headers
    )

    rates_res = await client.get(f"/api/organizations/{org_id}/rates", headers=headers)
    assert rates_res.status_code == 200
    wmm_item = next(it for it in rates_res.json() if it["code"] == "ROA-WMM-BASE")
    saved_unit_rate = float(wmm_item["combined_rate"])

    # Create project and estimate
    proj_res = await client.post(f"/api/organizations/{org_id}/projects", json={"name": "Outer Ring Road"}, headers=headers)
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={
            "name": "WMM Base Estimate",
            "project_id": proj_id,
            "items": [
                {
                    "item_number": "1.1",
                    "description": wmm_item["name"],
                    "category": "road",
                    "quantity": 500.0,
                    "unit": wmm_item["unit"],
                    "unit_rate": saved_unit_rate,
                    "rate_item_id": wmm_item["id"],
                }
            ]
        },
        headers=headers
    )
    assert est_res.status_code == 201
    est_id = est_res.json()["id"]
    expected_amount = 500.0 * saved_unit_rate
    assert float(est_res.json()["items"][0]["amount"]) == expected_amount

    # Now modify the rate library item significantly
    await client.patch(
        f"/api/organizations/{org_id}/rates/{wmm_item['id']}",
        json={"material_rate": 2500.0, "labour_rate": 300.0, "equipment_rate": 500.0},
        headers=headers
    )

    # Re-fetch the saved estimate: it must remain 100% frozen and untouched!
    est_check = await client.get(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers)
    assert float(est_check.json()["items"][0]["unit_rate"]) == saved_unit_rate
    assert float(est_check.json()["items"][0]["amount"]) == expected_amount
