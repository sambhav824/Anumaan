import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_drawing_takeoff_lifecycle_and_boq_transfer(client: AsyncClient, token_a: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Create Organization, Project, and Estimate
    res_org = await client.post("/api/organizations", json={"name": "Skyline Blueprint Works"}, headers=headers_a)
    assert res_org.status_code in (200, 201)
    org_id = res_org.json()["id"]

    res_proj = await client.post(
        f"/api/organizations/{org_id}/projects",
        json={"name": "Green Valley Villa Plan", "project_type": "building"},
        headers=headers_a,
    )
    assert res_proj.status_code == 201
    project_id = res_proj.json()["id"]

    res_est = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={
            "project_id": project_id,
            "estimate_number": "EST-TK-001",
            "name": "Villa BOQ from Drawings",
            "category": "building",
        },
        headers=headers_a,
    )
    assert res_est.status_code == 201
    estimate_id = res_est.json()["id"]

    # 2. Upload Drawing (Simulate PNG blueprint)
    fake_png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
    files = {"file": ("villa_ground_floor.png", io.BytesIO(fake_png_bytes), "image/png")}
    data = {"name": "Ground Floor Architectural Plan", "estimate_id": estimate_id}

    upload_res = await client.post(
        f"/api/organizations/{org_id}/projects/{project_id}/drawings",
        headers=headers_a,
        data=data,
        files=files,
    )
    assert upload_res.status_code == 201, upload_res.text
    drawing = upload_res.json()
    assert drawing["name"] == "Ground Floor Architectural Plan"
    assert drawing["file_format"] == "PNG"
    drawing_id = drawing["id"]

    # 3. List Drawings for Project
    list_res = await client.get(
        f"/api/organizations/{org_id}/projects/{project_id}/drawings",
        headers=headers_a,
    )
    assert list_res.status_code == 200
    drawings = list_res.json()
    assert len(drawings) >= 1
    assert drawings[0]["id"] == drawing_id

    # 4. Save Scale Calibration (e.g. 200px = 10.0m => 0.05 m/px)
    calib_payload = {
        "scale_calibration": {
            "pageNumber": 1,
            "knownDistance": 10.0,
            "unit": "m",
            "pixelDistance": 200.0,
            "scaleRatio": 0.05,
            "isCalibrated": True,
        }
    }
    patch_calib_res = await client.patch(
        f"/api/organizations/{org_id}/drawings/{drawing_id}",
        headers=headers_a,
        json=calib_payload,
    )
    assert patch_calib_res.status_code == 200
    updated_drawing = patch_calib_res.json()
    assert updated_drawing["scale_calibration"]["scaleRatio"] == 0.05

    # 5. Add Takeoff Measurement (Living Room Flooring Area = 50.0 sqm)
    m_payload = {
        "page_number": 1,
        "name": "Living Room Tile Floor",
        "measurement_type": "area",
        "quantity": 50.0,
        "unit": "sqm",
        "coordinates": [{"x": 100, "y": 100}, {"x": 300, "y": 100}, {"x": 300, "y": 200}, {"x": 100, "y": 200}],
        "notes": "Measured from drawing sheet 1",
    }
    m_res = await client.post(
        f"/api/organizations/{org_id}/drawings/{drawing_id}/measurements",
        headers=headers_a,
        json=m_payload,
    )
    assert m_res.status_code == 201, m_res.text
    measurement = m_res.json()
    assert float(measurement["quantity"]) == 50.0
    assert measurement["name"] == "Living Room Tile Floor"
    measurement_id = measurement["id"]

    # 6. Transfer Measurement to Estimate BOQ ("Add to Estimate")
    transfer_payload = {
        "estimate_id": estimate_id,
        "item_number": "1.1",
        "description": "Vitrified Ceramic Floor Tiles 600x600mm with Grouting",
        "category": "material",
        "quantity": 52.5,  # with 5% tile cutting wastage
        "unit": "sqm",
        "unit_rate": 950.0,
        "notes": "Measured directly on plan; includes 5% cutting wastage.",
        "calculation_details": {
            "formula": "50.0 sqm × 1.05 wastage = 52.5 sqm",
            "net_area_sqm": 50.0,
        },
    }
    transfer_res = await client.post(
        f"/api/organizations/{org_id}/drawings/{drawing_id}/measurements/{measurement_id}/transfer-to-estimate",
        headers=headers_a,
        json=transfer_payload,
    )
    assert transfer_res.status_code == 201, transfer_res.text
    trans_data = transfer_res.json()
    assert trans_data["status"] == "success"
    assert trans_data["amount"] == 49875.0  # 52.5 * 950.0

    # 7. Verify the BOQ Item is now present in the Estimate
    est_res = await client.get(
        f"/api/organizations/{org_id}/estimates/{estimate_id}",
        headers=headers_a,
    )
    assert est_res.status_code == 200
    est_data = est_res.json()
    assert len(est_data["items"]) >= 1
    boq_item = est_data["items"][0]
    assert boq_item["description"] == "Vitrified Ceramic Floor Tiles 600x600mm with Grouting"
    assert float(boq_item["amount"]) == 49875.0
    assert boq_item["calculation_type"] == "drawing_takeoff"

    # 8. Delete measurement and drawing
    del_m = await client.delete(
        f"/api/organizations/{org_id}/drawings/{drawing_id}/measurements/{measurement_id}",
        headers=headers_a,
    )
    assert del_m.status_code == 204

    del_d = await client.delete(
        f"/api/organizations/{org_id}/drawings/{drawing_id}",
        headers=headers_a,
    )
    assert del_d.status_code == 204

    # 9. Test Direct AI Drawing-to-BOQ Analyzer endpoint
    road_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 300
    files_road = {"file": ("Rural Road Engineering Plan Sheet (1).png", io.BytesIO(road_png), "image/png")}
    road_analyze_res = await client.post(
        f"/api/organizations/{org_id}/estimates/{estimate_id}/drawings/analyze",
        headers=headers_a,
        files=files_road,
    )
    assert road_analyze_res.status_code == 200, road_analyze_res.text
    road_data = road_analyze_res.json()
    assert road_data["drawing_domain"] == "Rural Road Construction & Pavement Infrastructure"
    assert len(road_data["detected_items"]) == 8
    assert road_data["total_estimated_amount"] > 0
    assert any("GSB" in it["description"] for it in road_data["detected_items"])
    assert any("WMM" in it["description"] for it in road_data["detected_items"])
    assert any("Bituminous" in it["description"] for it in road_data["detected_items"])


