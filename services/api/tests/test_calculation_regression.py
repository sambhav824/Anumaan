from decimal import Decimal
import pytest
from app.core.calculations import (
    calculate_road_area,
    calculate_road_layers,
    calculate_road_earthwork,
    calculate_estimate_totals,
)

def test_example_1_road_area():
    """Example 1: Road area: length 100m, width 5m -> 500 m²"""
    res = calculate_road_area(100, 5, "m")
    assert res["quantity"] == Decimal("500.0000")
    assert res["unit"] == "sqm"
    assert "500.00 sqm" in res["formula"]


def test_example_2_pavement_layer():
    """Example 2: Pavement layer: length 100m, width 5m, thickness 200mm -> 100 m³"""
    # Explicit thickness_unit='mm'
    res = calculate_road_layers(100, 5, 200, Decimal("1.0"), "m", "mm")
    assert res["quantity"] == Decimal("100.0000")
    assert res["unit"] == "cum"

    # Auto-detection of thickness >= 1.0 when unit is metres
    auto_res = calculate_road_layers(100, 5, 200, Decimal("1.0"), "m")
    assert auto_res["quantity"] == Decimal("100.0000")
    assert auto_res["unit"] == "cum"


def test_example_3_cost_calculation():
    """Example 3: Cost calculation: 100 units at ₹250 -> ₹25,000"""
    items = [{"quantity": 100, "unit_rate": 250}]
    totals = calculate_estimate_totals(items, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"))
    assert totals["subtotal"] == Decimal("25000.00")
    assert totals["taxable_amount"] == Decimal("25000.00")
    assert totals["grand_total"] == Decimal("25000.00")


def test_example_4_unit_conversion():
    """Example 4: Unit conversion: length 100m, width 5m, thickness 150mm -> 75 m³"""
    res = calculate_road_layers(100, 5, 150, Decimal("1.0"), "m", "mm")
    assert res["quantity"] == Decimal("75.0000")
    assert res["unit"] == "cum"

    # Loose volume with GSB compaction factor 1.25
    gsb_res = calculate_road_layers(100, 5, 150, Decimal("1.25"), "m", "mm")
    assert gsb_res["quantity"] == Decimal("75.0000")
    assert gsb_res["loose_volume_cum"] == Decimal("93.7500")


def test_example_5_missing_rate_does_not_zero_quantity():
    """Example 5: Missing rate handling: valid quantity with missing rate does not erase quantity"""
    valid_qty = Decimal("75.0000")
    missing_rate = Decimal("0.00")
    items = [{"quantity": valid_qty, "unit_rate": missing_rate}]
    totals = calculate_estimate_totals(items, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"))
    assert items[0]["quantity"] == Decimal("75.0000")
    assert totals["subtotal"] == Decimal("0.00")

    # When rate is entered
    updated_items = [{"quantity": valid_qty, "unit_rate": Decimal("1450.00")}]
    updated_totals = calculate_estimate_totals(
        updated_items,
        overhead_pct=Decimal("5.0"),
        contingency_pct=Decimal("3.0"),
        discount_pct=Decimal("0.0"),
        gst_pct=Decimal("18.0"),
    )
    assert updated_totals["subtotal"] == Decimal("108750.00")
    assert updated_totals["taxable_amount"] == Decimal("117450.00")
    assert updated_totals["grand_total"] == Decimal("138591.00")


def test_road_earthwork():
    """Test road earthwork excavation and fill"""
    cut = calculate_road_earthwork(100, 5, Decimal("0.5"), "cut", "m")
    assert cut["quantity"] == Decimal("250.0000")
    assert cut["cut_or_fill"] == "cut"

    fill = calculate_road_earthwork(100, 5, Decimal("0.8"), "fill", "m")
    assert fill["quantity"] == Decimal("400.0000")
    assert fill["cut_or_fill"] == "fill"
