import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_project_lifecycle_isolation_and_metrics(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Org A and Org B
    res_a = await client.post("/api/organizations", json={"name": "Sahyadri Infra"}, headers=headers_a)
    org_a_id = res_a.json()["id"]

    res_b = await client.post("/api/organizations", json={"name": "North Roads Ltd"}, headers=headers_b)
    org_b_id = res_b.json()["id"]

    # Create Client in Org A
    c_a_res = await client.post(
        f"/api/organizations/{org_a_id}/clients",
        json={"name": "Client Org A"},
        headers=headers_a
    )
    client_a_id = c_a_res.json()["id"]

    # Create Client in Org B
    c_b_res = await client.post(
        f"/api/organizations/{org_b_id}/clients",
        json={"name": "Client Org B"},
        headers=headers_b
    )
    client_b_id = c_b_res.json()["id"]

    # 1. CROSS-TENANT CLIENT ASSIGNMENT DENIAL:
    # Attempting to assign Client from Org B to Project in Org A must fail with 400
    invalid_proj_payload = {
        "name": "Invalid Project",
        "project_type": "building",
        "client_id": client_b_id, # BELONGS TO ORG B!
    }
    invalid_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json=invalid_proj_payload,
        headers=headers_a
    )
    assert invalid_res.status_code == 400
    assert "Assigned client does not exist or does not belong to this organization" in invalid_res.json()["detail"]

    # 2. Create valid Building Project in Org A (Hindi content)
    bldg_payload = {
        "name": "शान्ति हाइट्स टॉवर",
        "project_type": "building",
        "client_id": client_a_id,
        "site_location": "सेक्टर २१, खारघर",
        "city": "नवी मुंबई",
        "state": "महाराष्ट्र",
        "status": "planning",
        "quotation_language": "hi"
    }
    bldg_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json=bldg_payload,
        headers=headers_a
    )
    assert bldg_res.status_code == 201
    bldg_proj = bldg_res.json()
    assert bldg_proj["name"] == "शान्ति हाइट्स टॉवर"
    assert bldg_proj["project_type"] == "building"
    assert bldg_proj["client_name"] == "Client Org A"
    bldg_id = bldg_proj["id"]

    # 3. Create valid Road Project in Org A (Marathi content)
    road_payload = {
        "name": "हिंजवडी वाकड रस्ता प्रकल्प",
        "project_type": "road",
        "client_id": client_a_id,
        "status": "in_progress",
        "quotation_language": "mr"
    }
    road_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json=road_payload,
        headers=headers_a
    )
    assert road_res.status_code == 201
    road_id = road_res.json()["id"]

    # 4. Filter projects by type: 'road'
    filter_road = await client.get(
        f"/api/organizations/{org_a_id}/projects?project_type=road",
        headers=headers_a
    )
    assert filter_road.status_code == 200
    road_list = filter_road.json()
    assert len(road_list) == 1
    assert road_list[0]["id"] == road_id

    # Filter projects by type: 'building'
    filter_bldg = await client.get(
        f"/api/organizations/{org_a_id}/projects?project_type=building",
        headers=headers_a
    )
    assert filter_bldg.status_code == 200
    bldg_list = filter_bldg.json()
    assert len(bldg_list) == 1
    assert bldg_list[0]["id"] == bldg_id

    # 5. Archive Project
    archive_res = await client.post(
        f"/api/organizations/{org_a_id}/projects/{bldg_id}/archive",
        headers=headers_a
    )
    assert archive_res.status_code == 200
    assert archive_res.json()["status"] == "archived"

    # 6. CROSS-TENANT PROJECT ACCESS DENIAL: User B attempts to access Org A's project
    cross_get_proj = await client.get(
        f"/api/organizations/{org_a_id}/projects/{road_id}",
        headers=headers_b
    )
    assert cross_get_proj.status_code == 403

    # 7. Dashboard Metrics for Org A:
    # 2 total projects (1 archived, 1 in_progress)
    # 1 active project (in_progress)
    # 1 client
    metrics_res = await client.get(
        f"/api/organizations/{org_a_id}/dashboard-metrics",
        headers=headers_a
    )
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total_projects"] == 2
    assert metrics["active_projects"] == 1
    assert metrics["total_clients"] == 1
    assert metrics["draft_estimates"] == 0
    assert metrics["pending_quotations"] == 0
    assert metrics["accepted_quotations"] == 0
