import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rate_library_crud_and_isolation(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Org A and Org B
    res_a = await client.post("/api/organizations", json={"name": "Rates Org A"}, headers=headers_a)
    assert res_a.status_code == 201
    org_a_id = res_a.json()["id"]

    res_b = await client.post("/api/organizations", json={"name": "Rates Org B"}, headers=headers_b)
    assert res_b.status_code == 201
    org_b_id = res_b.json()["id"]

    # 1. User A creates a rate item in Org A
    rate_payload = {
        "name": "M25 Ready Mix Concrete",
        "category": "material",
        "unit": "cum",
        "material_rate": "5500.00",
        "labour_rate": "450.00",
        "combined_rate": "5950.00",
        "supplier_or_location": "UltraTech RMC Plant, Hadapsar",
        "notes": "Includes transit mixer freight within 15km",
    }
    create_res = await client.post(
        f"/api/organizations/{org_a_id}/rates",
        json=rate_payload,
        headers=headers_a,
    )
    assert create_res.status_code == 201
    rate_data = create_res.json()
    assert rate_data["name"] == "M25 Ready Mix Concrete"
    assert rate_data["combined_rate"] == "5950.00"
    rate_id = rate_data["id"]

    # 2. Filter by category & search
    search_res = await client.get(
        f"/api/organizations/{org_a_id}/rates?search=Ready Mix&category=material",
        headers=headers_a,
    )
    assert search_res.status_code == 200
    items = search_res.json()
    assert len(items) == 1
    assert items[0]["id"] == rate_id

    # 3. Update rate item
    upd_res = await client.put(
        f"/api/organizations/{org_a_id}/rates/{rate_id}",
        json={"material_rate": "5600.00"},
        headers=headers_a,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["material_rate"] == "5600.00"
    assert upd_res.json()["combined_rate"] == "6050.00"

    # 4. Cross-tenant isolation: User B in Org B cannot read Org A's rate item
    cross_res = await client.get(
        f"/api/organizations/{org_a_id}/rates/{rate_id}",
        headers=headers_b,
    )
    assert cross_res.status_code == 403

    # User B list Org A rates -> 403 Forbidden
    cross_list = await client.get(
        f"/api/organizations/{org_a_id}/rates",
        headers=headers_b,
    )
    assert cross_list.status_code == 403


@pytest.mark.asyncio
async def test_actual_expenses_and_cost_variance(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create Org A, Project, and Estimate
    res_a = await client.post("/api/organizations", json={"name": "Expense Org A"}, headers=headers_a)
    org_a_id = res_a.json()["id"]

    proj_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json={"name": "Residential Bungalow", "project_type": "building"},
        headers=headers_a,
    )
    proj_id = proj_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json={"project_id": proj_id, "name": "Civil Core Estimate", "category": "building"},
        headers=headers_a,
    )
    est_id = est_res.json()["id"]

    # Add BOQ item so estimate has a total: 100 cum @ 1000 = 1,00,000.00
    await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/items",
        json={
            "item_number": "1.0",
            "description": "PCC Work",
            "quantity": "100.0",
            "unit": "cum",
            "unit_rate": "1000.0",
        },
        headers=headers_a,
    )

    # 1. Variance before any expenses: under budget (or 0 actual cost)
    var_res1 = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/expenses/variance",
        headers=headers_a,
    )
    assert var_res1.status_code == 200
    var1 = var_res1.json()
    assert var1["estimated_amount"] == "100000.00"
    assert var1["actual_amount"] == "0.00"
    assert var1["difference"] == "-100000.00"
    assert var1["status"] == "under_budget"

    # 2. Record actual expense 1: 60,000 cement & sand
    exp1_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/expenses",
        json={
            "category": "material",
            "description": "500 Bags OPC 53 Cement",
            "amount": "60000.00",
            "expense_date": "2026-10-25",
            "vendor_or_payee": "Birla Gold Cement Depot",
        },
        headers=headers_a,
    )
    assert exp1_res.status_code == 201

    # Record actual expense 2: 50,000 labour payout -> Total actual = 1,10,000.00 (OVER BUDGET)
    exp2_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/expenses",
        json={
            "category": "labour",
            "description": "Labour contractor weekly settlement",
            "amount": "50000.00",
            "expense_date": "2026-10-25",
            "vendor_or_payee": "Omkar Labour Agency",
        },
        headers=headers_a,
    )
    assert exp2_res.status_code == 201

    # 3. Variance after expenses: 1,10,000 vs 1,00,000 -> +10,000 (10.0% over budget)
    var_res2 = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/expenses/variance",
        headers=headers_a,
    )
    assert var_res2.status_code == 200
    var2 = var_res2.json()
    assert var2["actual_amount"] == "110000.00"
    assert var2["difference"] == "10000.00"
    assert var2["variance_pct"] == "10.00"
    assert var2["status"] == "over_budget"
    assert var2["total_expenses_count"] == 2
    assert len(var2["categories_breakdown"]) == 2

    # 4. Cross-tenant isolation
    cross_exp = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/expenses",
        headers=headers_b,
    )
    assert cross_exp.status_code == 403


@pytest.mark.asyncio
async def test_drawing_upload_validation_and_boundary(client: AsyncClient, token_a: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_a = await client.post("/api/organizations", json={"name": "Drawing Org"}, headers=headers_a)
    org_id = res_a.json()["id"]

    proj_res = await client.post(
        f"/api/organizations/{org_id}/projects",
        json={"name": "Commercial Tower", "project_type": "building"},
        headers=headers_a,
    )
    proj_id = proj_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"project_id": proj_id, "name": "Structural Plan Estimate", "category": "building"},
        headers=headers_a,
    )
    est_id = est_res.json()["id"]

    # 1. Invalid file extension rejected (.exe)
    invalid_files = {"file": ("malicious.exe", b"invalid binary content", "application/octet-stream")}
    res_inv = await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/drawings/analyze",
        files=invalid_files,
        headers=headers_a,
    )
    assert res_inv.status_code == 400
    assert "Unsupported file format" in res_inv.json()["detail"]

    # 2. Valid PDF file upload without GEMINI_API_KEY returns transparent boundary
    pdf_files = {"file": ("structural_plan_G4.pdf", b"%PDF-1.4 sample architectural drawing sheet", "application/pdf")}
    res_pdf = await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/drawings/analyze",
        files=pdf_files,
        headers=headers_a,
    )
    assert res_pdf.status_code == 200
    boundary = res_pdf.json()
    assert boundary["filename"] == "structural_plan_G4.pdf"
    assert boundary["file_format"] == "PDF"
    assert boundary["requires_human_review"] is True
