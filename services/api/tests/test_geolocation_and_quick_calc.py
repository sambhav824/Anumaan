import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.calculations import (
    calculate_quick_building_estimate,
    calculate_boundary_wall_quantities,
)


@pytest.mark.asyncio
async def test_geolocation_reverse_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test with Pune/Maharashtra coordinates
        res = await client.get("/api/geolocation/reverse?lat=18.5204&lon=73.8567")
        assert res.status_code == 200
        data = res.json()
        assert "city" in data
        assert "state" in data
        assert data["suggested_region_id"] in ("maharashtra_pwd", "national_cpwd")
        assert "authority" in data
        assert "source_doc" in data


def test_quick_building_estimate_engine():
    # 1500 sq.ft, 2 floors, standard quality in Maharashtra
    res = calculate_quick_building_estimate(1500, floors=2, quality_tier="standard", region_id="maharashtra_pwd")
    assert res["built_up_area_sqft"] == Decimal("3000.00")
    assert res["cost_per_sqft"] == Decimal("2100.00")
    assert res["total_estimated_cost"] == Decimal("6300000.00")
    assert res["materials"]["cement_bags"] > 1000
    assert res["materials"]["steel_tonnes"] > Decimal("10.0")
    assert len(res["boq_preview"]) == 7


def test_boundary_wall_calculation_engine():
    # 40m long, 2.1m high, 230mm brick wall with 3m x 2m gate
    res = calculate_boundary_wall_quantities(
        length_m=40,
        height_m=Decimal("2.1"),
        thickness_mm=230,
        masonry_type="clay_brick",
        gate_width_m=3,
        gate_height_m=2,
    )
    # Gross area = 84 sqm, Gate = 6 sqm, Net = 78 sqm
    assert res["net_wall_area_sqm"] == Decimal("78.00")
    assert res["masonry_volume_cum"] == Decimal("17.9400")
    assert res["units_count"] > 9000  # ~9,418 bricks
    assert res["excavation_volume_cum"] > Decimal("15.0")
    assert res["foundation_pcc_cum"] > Decimal("2.0")
    assert len(res["boq_preview"]) == 6


def test_invalid_negative_dimensions_rejected():
    with pytest.raises(ValueError):
        calculate_quick_building_estimate(-500)

    with pytest.raises(ValueError):
        calculate_boundary_wall_quantities(-10, 2)

