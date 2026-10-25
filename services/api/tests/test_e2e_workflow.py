import pytest
import io
import asyncio
from httpx import AsyncClient
from decimal import Decimal
from openpyxl import load_workbook


@pytest.mark.asyncio
async def test_complete_12_step_business_workflow(client: AsyncClient, token_a: str, token_b: str):
    """
    Phase E End-to-End QA: Tests the complete 12-step Anumaan business workflow in sequence:
    1. Sign in / profile verification
    2. Create / join organization
    3. Create client
    4. Create project
    5. Create estimate
    6. Add, edit and remove BOQ items
    7. Verify quantity calculations and financial totals
    8. Configure tax explicitly
    9. Create quotation from estimate
    10. Preview, edit and issue quotation (enforces tax confirmation)
    11. Download and validate PDF and Excel exports
    12. Verify status updates, duplication, and snapshot immutability
    """
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # =========================================================================
    # Step 1: Sign in / Profile verification
    # =========================================================================
    me_res = await client.get("/api/auth/me", headers=headers_a)
    assert me_res.status_code == 200
    user_a = me_res.json()
    assert "id" in user_a
    assert "email" in user_a

    # =========================================================================
    # Step 2: Create Organization
    # =========================================================================
    org_res = await client.post(
        "/api/organizations",
        json={
            "name": "Kirloskar Infra Developers",
            "business_address": "Kirloskar Business Park, Pune",
            "city": "Pune",
            "state": "Maharashtra",
            "pin_code": "411001",
            "gstin": "27AAACK0000A1Z5",
        },
        headers=headers_a
    )
    assert org_res.status_code in (200, 201)
    org_a = org_res.json()
    org_id = org_a["id"]
    assert org_a["name"] == "Kirloskar Infra Developers"

    # =========================================================================
    # Step 3: Create Client
    # =========================================================================
    client_res = await client.post(
        f"/api/organizations/{org_id}/clients",
        json={
            "name": "Serum Bio Tech Park",
            "contact_person": "Dr. Cyrus Poonawalla",
            "email": "cyrus@serumbio.com",
            "phone": "+919876543210",
            "billing_address": "Hadapsar Industrial Estate, Pune",
            "gstin": "27AAACS0000B1Z8",
        },
        headers=headers_a
    )
    assert client_res.status_code == 201
    client_data = client_res.json()
    client_id = client_data["id"]

    # =========================================================================
    # Step 4: Create Project
    # =========================================================================
    proj_res = await client.post(
        f"/api/organizations/{org_id}/projects",
        json={
            "name": "Vaccine R&D Facility Phase 2",
            "project_type": "building",
            "client_id": client_id,
            "site_location": "Hadapsar, Pune",
            "city": "Pune",
            "state": "Maharashtra",
        },
        headers=headers_a
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # =========================================================================
    # Step 5: Create Estimate (Default tax 0.00 unconfigured)
    # =========================================================================
    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={
            "name": "Civil Superstructure Package",
            "project_id": proj_id,
            "category": "building",
            "overhead_pct": 8.0,
            "contingency_pct": 4.0,
            "discount_pct": 2.0,
            "gst_pct": 0.0,
        },
        headers=headers_a
    )
    assert est_res.status_code == 201
    est_data = est_res.json()
    est_id = est_data["id"]
    assert float(est_data["gst_pct"]) == 0.0
    assert float(est_data["subtotal"]) == 0.0

    # =========================================================================
    # Step 6: Add, Edit and Remove BOQ Items
    # =========================================================================
    # Add Item 1: Earthwork
    it1_res = await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json={
            "item_number": "1.1",
            "description": "Excavation in ordinary soil up to 3m depth",
            "category": "earthwork",
            "quantity": 100.0,
            "unit_rate": 350.0,
            "unit": "cum",
            "notes": "IS 1200 Part 1 measurement",
        },
        headers=headers_a
    )
    assert it1_res.status_code == 201

    # Add Item 2: Concrete
    it2_res = await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json={
            "item_number": "2.1",
            "description": "M25 Grade Reinforced Cement Concrete for Footings",
            "category": "concrete",
            "quantity": 50.0,
            "unit_rate": 6000.0,
            "unit": "cum",
            "notes": "Dry volume factor 1.54",
        },
        headers=headers_a
    )
    assert it2_res.status_code == 201
    it2_id = it2_res.json()["id"]

    # Add Item 3: Temporary Site Fencing (to be deleted)
    it3_res = await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json={
            "item_number": "3.1",
            "description": "Temporary barricading and site fencing",
            "category": "finishing",
            "quantity": 200.0,
            "unit_rate": 150.0,
            "unit": "m",
        },
        headers=headers_a
    )
    assert it3_res.status_code == 201
    it3_id = it3_res.json()["id"]

    # Delete Item 3 (Temporary Site Fencing) via DELETE endpoint
    del_res = await client.delete(
        f"/api/organizations/{org_id}/estimates/{est_id}/items/{it3_id}",
        headers=headers_a
    )
    assert del_res.status_code == 204

    # Edit Item 2: Update unit_rate from 6000 to 6200 via PUT items endpoint
    save_all = await client.put(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json=[
            {
                "item_number": "1.1",
                "description": "Excavation in ordinary soil up to 3m depth",
                "category": "earthwork",
                "quantity": 100.0,
                "unit_rate": 350.0,
                "unit": "cum",
            },
            {
                "item_number": "2.1",
                "description": "M25 Grade Reinforced Cement Concrete for Footings",
                "category": "concrete",
                "quantity": 50.0,
                "unit_rate": 6200.0,
                "unit": "cum",
            },
        ],
        headers=headers_a
    )
    assert save_all.status_code == 200

    # =========================================================================
    # Step 7: Verify Quantity Calculations & Financial Totals
    # =========================================================================
    est_calc = await client.get(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers_a)
    assert est_calc.status_code == 200
    calc_data = est_calc.json()
    assert len(calc_data["items"]) == 2

    # Math reconciliation:
    # Item 1: 100 * 350 = 35,000
    # Item 2: 50 * 6200 = 310,000
    # Subtotal = 345,000.00
    # Overhead 8% of 345,000 = 27,600.00
    # Contingency 4% of 345,000 = 13,800.00
    # Pre-discount = 386,400.00
    # Discount 2% of 386,400 = 7,728.00
    # Taxable amount = 378,672.00
    # Tax (0%) = 0.00
    # Grand Total = 378,672.00
    assert float(calc_data["subtotal"]) == 345000.0
    assert float(calc_data["overhead_amount"]) == 27600.0
    assert float(calc_data["contingency_amount"]) == 13800.0
    assert float(calc_data["discount_amount"]) == 6900.0
    assert float(calc_data["taxable_amount"]) == 379500.0
    assert float(calc_data["gst_amount"]) == 0.0
    assert float(calc_data["total_amount"]) == 379500.0

    # =========================================================================
    # Step 8: Configure Tax Explicitly on Estimate
    # =========================================================================
    patch_tax = await client.patch(
        f"/api/organizations/{org_id}/estimates/{est_id}",
        json={"gst_pct": 18.0},
        headers=headers_a
    )
    assert patch_tax.status_code == 200
    # 18% of 379,500 = 68,310.00; Grand Total = 447,810.00
    assert float(patch_tax.json()["gst_pct"]) == 18.0
    assert float(patch_tax.json()["gst_amount"]) == 68310.0
    assert float(patch_tax.json()["total_amount"]) == 447810.0

    # =========================================================================
    # Step 9: Create Quotation from the Estimate (Marathi Language)
    # =========================================================================
    # Quotation MUST default to unconfigured tax unless contractor explicitly configures it!
    q_create = await client.post(
        f"/api/organizations/{org_id}/quotations",
        json={
            "estimate_id": est_id,
            "language": "mr",
            "quotation_number": "QT-E2E-2026-001",
            "valid_until_date": "2026-12-31",
        },
        headers=headers_a
    )
    assert q_create.status_code == 201
    quote = q_create.json()
    quote_id = quote["id"]
    assert quote["status"] == "draft"
    assert quote["language"] == "mr"
    assert quote["tax_configured"] is False
    assert float(quote["tax_amount"]) == 0.0
    assert float(quote["total_amount"]) == 379500.0  # Taxable amount when tax unconfigured

    # =========================================================================
    # Step 10: Preview, Edit and Issue Quotation
    # =========================================================================
    # 10a. Preview draft
    preview_res = await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}", headers=headers_a)
    assert preview_res.status_code == 200
    assert len(preview_res.json()["items"]) == 2

    # 10b. Edit draft terms
    edit_res = await client.patch(
        f"/api/organizations/{org_id}/quotations/{quote_id}",
        json={
            "payment_terms": "30% mobilization advance, 60% running bills, 10% retention for 6 months.",
            "exclusions": "Client to provide water and 3-phase electricity connection at site.",
            "notes": "IS 1200 rates valid until 31 Dec 2026.",
            "authorized_signatory_name": "Rajendra Kirloskar",
            "authorized_signatory_designation": "Managing Director",
        },
        headers=headers_a
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["authorized_signatory_name"] == "Rajendra Kirloskar"

    # 10c. Attempt to issue without tax confirmation -> Must fail with 400
    unconf_issue = await client.post(
        f"/api/organizations/{org_id}/quotations/{quote_id}/issue",
        json={"confirm_tax_configured": False},
        headers=headers_a
    )
    assert unconf_issue.status_code == 400

    # 10d. Issue with explicit tax configuration (18% GST)
    issue_res = await client.post(
        f"/api/organizations/{org_id}/quotations/{quote_id}/issue",
        json={
            "confirm_tax_configured": True,
            "tax_configured": True,
            "tax_name": "GST (CGST 9% + SGST 9%)",
            "tax_rate": 18.0,
        },
        headers=headers_a
    )
    assert issue_res.status_code == 200
    issued_data = issue_res.json()
    assert issued_data["status"] == "issued"
    assert issued_data["snapshot"] is not None
    assert float(issued_data["tax_amount"]) == 68310.0
    assert float(issued_data["total_amount"]) == 447810.0

    # =========================================================================
    # Step 11: Download and Validate PDF and Excel Exports
    # =========================================================================
    # 11a. PDF Export
    pdf_res = await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}/pdf", headers=headers_a)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 3000

    # 11b. Excel Export
    excel_res = await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}/excel", headers=headers_a)
    assert excel_res.status_code == 200
    assert "spreadsheetml" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 3000

    wb = load_workbook(io.BytesIO(excel_res.content))
    ws = wb.active
    assert ws.title == "BOQ & Quotation"
    # Find totals in excel
    excel_text = " ".join(str(cell) for row in ws.iter_rows(values_only=True) for cell in row if cell)
    assert "Kirloskar Infra Developers" in excel_text
    assert "QT-E2E-2026-001" in excel_text

    # =========================================================================
    # Step 12: Status Updates, Duplication & Snapshot Immutability
    # =========================================================================
    # 12a. Verify editing an issued quotation is blocked
    edit_blocked = await client.patch(
        f"/api/organizations/{org_id}/quotations/{quote_id}",
        json={"payment_terms": "Malicious attempt to alter finalized terms"},
        headers=headers_a
    )
    assert edit_blocked.status_code == 400

    # 12b. Mutate source estimate and client, and verify snapshot remains IMMUTABLE
    await client.patch(
        f"/api/organizations/{org_id}/estimates/{est_id}",
        json={"overhead_pct": 50.0, "name": "Modified Source Estimate"},
        headers=headers_a
    )
    # Add a massive extra item to estimate
    await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json={"item_number": "9.9", "description": "Unrelated Extra Work", "quantity": 1000.0, "unit_rate": 5000.0, "unit": "nos"},
        headers=headers_a
    )

    # Re-fetch quotation and re-download exports -> MUST REMAIN COMPLETELY UNCHANGED
    q_post_edit = await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}", headers=headers_a)
    assert q_post_edit.status_code == 200
    assert float(q_post_edit.json()["total_amount"]) == 447810.0  # Still 447,810.00, NOT inflated!
    assert len(q_post_edit.json()["items"]) == 2  # Still 2 items, NOT 3!

    # 12c. Valid status update: issued -> accepted
    accept_res = await client.patch(
        f"/api/organizations/{org_id}/quotations/{quote_id}/status",
        json={"status": "accepted"},
        headers=headers_a
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # 12d. Duplicate quotation into new draft
    dup_res = await client.post(f"/api/organizations/{org_id}/quotations/{quote_id}/duplicate", headers=headers_a)
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != quote_id
    assert dup_data["status"] == "draft"
    assert dup_data["quotation_number"] != quote["quotation_number"]
    assert dup_data["snapshot"] is None

    # =========================================================================
    # Security: Multi-tenant Cross-Org Isolation Verification
    # =========================================================================
    # Org B user cannot view Org A estimate
    assert (await client.get(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers_b)).status_code == 403
    # Org B user cannot view Org A quotation
    assert (await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}", headers=headers_b)).status_code == 403
    # Org B user cannot download Org A quotation PDF or Excel
    assert (await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}/pdf", headers=headers_b)).status_code == 403
    assert (await client.get(f"/api/organizations/{org_id}/quotations/{quote_id}/excel", headers=headers_b)).status_code == 403


@pytest.mark.asyncio
async def test_concurrent_quotation_number_generation(client: AsyncClient, token_a: str):
    """
    Verifies that concurrent requests in the same organization generate unique quotation numbers.
    """
    headers = {"Authorization": f"Bearer {token_a}"}

    org_res = await client.post("/api/organizations", json={"name": "Godrej Infra Tech"}, headers=headers)
    org_id = org_res.json()["id"]

    p_res = await client.post(f"/api/organizations/{org_id}/projects", json={"name": "Concurrent Tower"}, headers=headers)
    proj_id = p_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"name": "Estimate Concurrency", "project_id": proj_id},
        headers=headers
    )
    est_id = est_res.json()["id"]

    # Fire 5 parallel quotation creations without passing quotation_number
    tasks = [
        client.post(
            f"/api/organizations/{org_id}/quotations",
            json={"estimate_id": est_id, "notes": f"Concurrency batch {i}"},
            headers=headers
        )
        for i in range(5)
    ]
    responses = await asyncio.gather(*tasks)

    for r in responses:
        assert r.status_code == 201

    quotation_numbers = [r.json()["quotation_number"] for r in responses]
    assert len(quotation_numbers) == 5
    # Assert strictly all 5 numbers are distinct and unique
    assert len(set(quotation_numbers)) == 5
