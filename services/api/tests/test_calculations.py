import pytest
from decimal import Decimal
from app.core.calculations import (
    convert_length_to_m,
    convert_area_to_sqm,
    convert_volume_to_cum,
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
)


def test_unit_conversions():
    # 1 international foot = 0.3048 m
    assert convert_length_to_m(Decimal("10"), "ft") == Decimal("3.048")
    assert convert_length_to_m(Decimal("1000"), "mm") == Decimal("1.0")
    assert convert_length_to_m(Decimal("100"), "cm") == Decimal("1.0")
    assert convert_length_to_m(Decimal("12"), "in") == Decimal("0.3048")

    # 100 sqft to sqm
    assert round(convert_area_to_sqm(Decimal("100"), "sqft"), 4) == Decimal("9.2903")

    # 1 brass area = 100 sqft = 9.290304 sqm
    assert round(convert_area_to_sqm(Decimal("1"), "brass"), 4) == Decimal("9.2903")

    # 1 brass volume = 100 cuft = 2.8316846592 cum
    assert round(convert_volume_to_cum(Decimal("1"), "brass"), 4) == Decimal("2.8317")
    assert round(convert_volume_to_cum(Decimal("100"), "cuft"), 2) == Decimal("2.83")


def test_excavation_calculation():
    # 10m x 5m x 2m with 20% swell
    res = calculate_excavation(10, 5, 2, unit="m", swell_factor=0.20)
    assert res["quantity"] == Decimal("100.0000")
    assert res["compacted_volume_cum"] == Decimal("100.0000")
    assert res["loose_volume_cum"] == Decimal("120.0000")
    assert res["unit"] == "cum"
    assert "Compacted" in res["formula"]
    assert "Loose" in res["formula"]

    # In feet
    res_ft = calculate_excavation(30, 15, 6, unit="ft")
    assert res_ft["compacted_volume_cum"] > 0

    # Negative dimension rejected
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_excavation(-10, 5, 2)


def test_concrete_calculation():
    # 6m x 0.3m x 0.45m beam with 2% wastage
    res = calculate_concrete(6, 0.3, 0.45, unit="m", wastage_pct=2.0)
    net_vol = Decimal("6") * Decimal("0.3") * Decimal("0.45")  # 0.81
    expected_gross = net_vol * Decimal("1.02")  # 0.8262
    assert res["net_volume_cum"] == Decimal("0.8100")
    assert res["gross_volume_cum"] == Decimal("0.8262")
    assert res["quantity"] == Decimal("0.8262")


def test_slab_concrete_calculation():
    # 120 sqm slab of 125mm (0.125m) thickness with 2% waste
    res = calculate_slab_concrete(120, 125, area_unit="sqm", thickness_unit="mm", wastage_pct=2.0)
    net_vol = Decimal("120") * Decimal("0.125")  # 15 cum
    expected_gross = net_vol * Decimal("1.02")  # 15.3 cum
    assert res["net_volume_cum"] == Decimal("15.0000")
    assert res["quantity"] == Decimal("15.3000")


def test_brickwork_calculation():
    # Wall: 10m length, 3m height, 0.23m thickness (9-inch wall)
    # Openings: Door (1m x 2.1m) and Window (1.2m x 1.2m)
    openings = [
        {"name": "Door D1", "length": 1.0, "height": 2.1, "thickness": 0.23, "count": 1},
        {"name": "Window W1", "length": 1.2, "height": 1.2, "thickness": 0.23, "count": 2},
    ]
    res = calculate_brickwork(10, 3, 0.23, openings=openings)
    gross_vol = Decimal("10") * Decimal("3") * Decimal("0.23")  # 6.90
    door_vol = Decimal("1.0") * Decimal("2.1") * Decimal("0.23")  # 0.483
    win_vol = Decimal("1.2") * Decimal("1.2") * Decimal("0.23") * Decimal("2")  # 0.6624
    total_ded = door_vol + win_vol  # 1.1454
    expected_net = gross_vol - total_ded  # 5.7546

    assert res["gross_volume_cum"] == Decimal("6.9000")
    assert res["deductions_cum"] == Decimal("1.1454")
    assert res["net_volume_cum"] == Decimal("5.7546")
    assert res["quantity"] == Decimal("5.7546")
    assert len(res["openings_breakdown"]) == 2

    # Excess deduction error
    with pytest.raises(ValueError, match="cannot exceed wall gross volume"):
        calculate_brickwork(2, 2, 0.23, openings=[{"length": 5, "height": 5, "thickness": 0.23}])


def test_plaster_calculation():
    # Wall 8m x 3m, 2 sides (both faces)
    # Opening 1.5m x 1.2m = 1.8 sqm (between 0.5 and 3.0 sqm)
    # Per IS 1200 Part XII Clause 7.2.2: when both faces are plastered, deduction is for ONE face only = 1.8 sqm
    openings = [{"name": "Window", "width": 1.5, "height": 1.2, "count": 1}]
    res = calculate_plaster(8, 3, sides=2, openings=openings, wastage_pct=0.0)
    gross_area = Decimal("8") * Decimal("3") * Decimal("2")  # 48 sqm
    ded = Decimal("1.5") * Decimal("1.2") * Decimal("1.0")  # 1.8 sqm (1 face deducted on 2-face plaster)
    expected_net = gross_area - ded  # 46.2 sqm

    assert res["gross_area_sqm"] == Decimal("48.0000")
    assert res["deductions_sqm"] == Decimal("1.8000")
    assert res["quantity"] == Decimal("46.2000")


def test_flooring_calculation():
    # 5m x 4m room with 5% cutting waste
    res = calculate_flooring(length=5, width=4, unit="m", wastage_pct=5.0)
    assert res["net_area_sqm"] == Decimal("20.0000")
    assert res["quantity"] == Decimal("21.0000")  # 20 * 1.05

    # Direct area in sqft converted to sqm
    res_sqft = calculate_flooring(area=200, area_unit="sqft", wastage_pct=0.0)
    assert round(res_sqft["quantity"], 2) == Decimal("18.58")


def test_painting_calculation():
    # 100 sqm surface, 2 coats, coverage 10 sqm/liter
    res = calculate_painting(area=100, coats=2, coverage_per_unit=10)
    assert res["quantity"] == Decimal("100.0000")  # BOQ unit quantity is surface area
    assert res["liters_required"] == Decimal("20.0000")  # 100 * 2 / 10


def test_reinforcement_calculation():
    # BBS details:
    # 10mm bars (10^2 / 162 = 0.61728 kg/m): 8 nos of 4.5m = 36m -> 22.22 kg
    # 16mm bars (16^2 / 162 = 1.58025 kg/m): 4 nos of 6.0m = 24m -> 37.93 kg
    bars = [
        {"bar_mark": "B1", "diameter_mm": 10, "length_m": 4.5, "count": 8},
        {"bar_mark": "B2", "diameter_mm": 16, "length_m": 6.0, "count": 4},
    ]
    res = calculate_reinforcement(bars, wastage_pct=5.0)
    w10 = Decimal("36") * (Decimal("100") / Decimal("162"))
    w16 = Decimal("24") * (Decimal("256") / Decimal("162"))
    net_wt = w10 + w16
    gross_wt = net_wt * Decimal("1.05")

    assert abs(res["net_weight_kg"] - net_wt) < Decimal("0.05")
    assert abs(res["gross_weight_kg"] - gross_wt) < Decimal("0.05")
    assert res["unit"] == "kg"
    assert len(res["bars_breakdown"]) == 2

    # Empty bars error
    with pytest.raises(ValueError, match="cannot be empty"):
        calculate_reinforcement([])


def test_road_layers_calculation():
    # 1000m road, 7m width, 150mm (0.15m) compacted WMM layer with 1.25 compaction factor
    res = calculate_road_layers(1000, 7, 0.15, compaction_factor=1.25)
    compacted = Decimal("1000") * Decimal("7") * Decimal("0.15")  # 1050 cum
    loose = compacted * Decimal("1.25")  # 1312.5 cum

    assert res["compacted_volume_cum"] == Decimal("1050.0000")
    assert res["loose_volume_cum"] == Decimal("1312.5000")
    assert res["quantity"] == Decimal("1050.0000")


def test_road_cross_sections_calculation():
    # Ch 0+000: Area = 24 sqm, Ch 0+030: Area = 36 sqm, Distance = 30m
    # Avg Area = (24 + 36)/2 = 30 sqm. Volume = 30 * 30 = 900 cum
    res = calculate_road_cross_sections(24, 36, 30)
    assert res["average_area_sqm"] == Decimal("30.0000")
    assert res["quantity"] == Decimal("900.0000")
    assert res["unit"] == "cum"


def test_estimate_totals_and_taxes():
    items = [
        {"quantity": Decimal("100"), "unit_rate": Decimal("250.00")},   # 25,000.00
        {"quantity": Decimal("50.5"), "unit_rate": Decimal("1000.00")}, # 50,500.00
    ]
    # Subtotal = 75,500.00
    # Overhead = 5% = 3,775.00
    # Contingency = 3% = 2,265.00
    # Discount = 2% = 1,510.00
    # Taxable = 75,500 + 3,775 + 2,265 - 1,510 = 80,030.00
    # GST = 18% = 14,405.40
    # Grand Total = 80,030.00 + 14,405.40 = 94,435.40
    totals = calculate_estimate_totals(
        items,
        overhead_pct=5.0,
        contingency_pct=3.0,
        discount_pct=2.0,
        gst_pct=18.0
    )

    assert totals["subtotal"] == Decimal("75500.00")
    assert totals["overhead_amount"] == Decimal("3775.00")
    assert totals["contingency_amount"] == Decimal("2265.00")
    assert totals["discount_amount"] == Decimal("1510.00")
    assert totals["taxable_amount"] == Decimal("80030.00")
    assert totals["gst_amount"] == Decimal("14405.40")
    assert totals["grand_total"] == Decimal("94435.40")
