"""
Backend Financial Accuracy and Calculation Integrity Test Suite.
Tests:
- Standard BOQ estimate calculation.
- Overhead and contingency application without double counting.
- Discount application.
- GST calculation (0%, 5%, 12%, 18%, 28%, custom).
- Zero and empty input resilience.
- Decimal precision & round-to-nearest paise.
- Negative values and invalid inputs.
- Multi-crore high monetary value calculations.
- Consistency between subtotal breakdown and grand total.
"""

import pytest
from decimal import Decimal
from app.core.calculations import calculate_estimate_totals


def test_standard_estimate_calculation():
    items = [
        {"quantity": Decimal("100"), "unit_rate": Decimal("450.00")},   # 45,000.00
        {"quantity": Decimal("50.5"), "unit_rate": Decimal("1200.00")}, # 60,600.00
    ]
    res = calculate_estimate_totals(
        items,
        overhead_pct=Decimal("0.0"),
        contingency_pct=Decimal("0.0"),
        discount_pct=Decimal("0.0"),
        gst_pct=Decimal("0.0"),
    )
    assert res["subtotal"] == Decimal("105600.00")
    assert res["taxable_amount"] == Decimal("105600.00")
    assert res["grand_total"] == Decimal("105600.00")
    assert res["gst_amount"] == Decimal("0.00")


def test_overhead_and_contingency_no_double_counting():
    # Base: 1,00,000.00
    # Overhead: 10% = 10,000.00
    # Contingency: 5% = 5,000.00
    # Both calculated strictly on base subtotal (not compounded)
    items = [{"quantity": 1000, "unit_rate": 100}]
    res = calculate_estimate_totals(
        items,
        overhead_pct=10,
        contingency_pct=5,
        discount_pct=0,
        gst_pct=0,
    )
    assert res["subtotal"] == Decimal("100000.00")
    assert res["overhead_amount"] == Decimal("100000.00") * Decimal("0.10")  # 10,000.00
    assert res["contingency_amount"] == Decimal("100000.00") * Decimal("0.05")  # 5,000.00
    assert res["taxable_amount"] == Decimal("115000.00")
    assert res["grand_total"] == Decimal("115000.00")


def test_discount_application():
    # Base: 2,00,000.00
    # Discount: 5% = 10,000.00
    # Taxable amount = 1,90,000.00
    items = [{"quantity": 200, "unit_rate": 1000}]
    res = calculate_estimate_totals(
        items,
        overhead_pct=0,
        contingency_pct=0,
        discount_pct=5,
        gst_pct=0,
    )
    assert res["subtotal"] == Decimal("200000.00")
    assert res["discount_amount"] == Decimal("100000.00") * Decimal("0.10")  # 10,000.00
    assert res["taxable_amount"] == Decimal("190000.00")
    assert res["grand_total"] == Decimal("190000.00")


def test_tax_calculation_rates():
    # Base 1,00,000. Test with 0%, 5%, 12%, 18%, 28%, custom (9%)
    items = [{"quantity": 100, "unit_rate": 1000}]
    rates = [
        (Decimal("0.0"), Decimal("0.00"), Decimal("100000.00")),
        (Decimal("5.0"), Decimal("5000.00"), Decimal("105000.00")),
        (Decimal("12.0"), Decimal("12000.00"), Decimal("112000.00")),
        (Decimal("18.0"), Decimal("18000.00"), Decimal("118000.00")),
        (Decimal("28.0"), Decimal("28000.00"), Decimal("128000.00")),
        (Decimal("9.0"), Decimal("9000.00"), Decimal("109000.00")),
    ]
    for rate, expected_gst, expected_grand in rates:
        res = calculate_estimate_totals(items, gst_pct=rate)
        assert res["gst_amount"] == expected_gst
        assert res["grand_total"] == expected_grand


def test_full_breakdown_transparent_arithmetic():
    # Subtotal: 5,00,000.00
    # Overhead: 8% = 40,000.00
    # Contingency: 4% = 20,000.00
    # Discount: 2% = 10,000.00
    # Taxable Amount: 5,00,000 + 40,000 + 20,000 - 10,000 = 5,50,000.00
    # GST 18%: 5,50,000 * 0.18 = 99,000.00
    # Grand Total: 5,50,000 + 99,000 = 6,49,000.00
    items = [{"quantity": 500, "unit_rate": 1000}]
    res = calculate_estimate_totals(
        items,
        overhead_pct=8,
        contingency_pct=4,
        discount_pct=2,
        gst_pct=18,
    )
    assert res["subtotal"] == Decimal("500000.00")
    assert res["overhead_amount"] == Decimal("400000.00") * Decimal("0.10")  # 40,000.00
    assert res["contingency_amount"] == Decimal("20000.00")
    assert res["discount_amount"] == Decimal("10000.00")
    assert res["taxable_amount"] == Decimal("550000.00")
    assert res["gst_amount"] == Decimal("99000.00")
    assert res["grand_total"] == Decimal("649000.00")


def test_empty_and_zero_values():
    # Empty items list
    res_empty = calculate_estimate_totals([])
    assert res_empty["subtotal"] == Decimal("0.00")
    assert res_empty["taxable_amount"] == Decimal("0.00")
    assert res_empty["grand_total"] == Decimal("0.00")

    # Zero quantity or rate
    res_zero = calculate_estimate_totals([
        {"quantity": 0, "unit_rate": 100},
        {"quantity": 50, "unit_rate": 0},
    ])
    assert res_zero["subtotal"] == Decimal("0.00")
    assert res_zero["grand_total"] == Decimal("0.00")


def test_decimal_rounding_paise():
    # 33.333 units @ 33.333 rate = 1111.088889 -> rounded to 1111.09
    items = [{"quantity": Decimal("33.333"), "unit_rate": Decimal("33.333")}]
    res = calculate_estimate_totals(items, gst_pct=Decimal("18.0"))
    assert res["subtotal"] == Decimal("1111.09")
    # GST: 1111.09 * 0.18 = 199.9962 -> 200.00
    assert res["gst_amount"] == Decimal("200.00")
    assert res["grand_total"] == Decimal("1311.09")


def test_negative_values_raise_error():
    with pytest.raises(ValueError, match="cannot be negative"):
        calculate_estimate_totals([{"quantity": -10, "unit_rate": 100}])

    with pytest.raises(ValueError, match="cannot be negative"):
        calculate_estimate_totals([{"quantity": 10, "unit_rate": -100}])

    with pytest.raises(ValueError, match="cannot be negative"):
        calculate_estimate_totals([{"quantity": 10, "unit_rate": 100}], overhead_pct=-5)


def test_multi_crore_large_totals():
    # Large infrastructure project: 50,00,00,000 INR (50 Crore)
    items = [
        {"quantity": Decimal("100000"), "unit_rate": Decimal("50000.00")}  # 5,00,00,00,000.00 (500 Crore)
    ]
    res = calculate_estimate_totals(
        items,
        overhead_pct=Decimal("5.0"),
        contingency_pct=Decimal("3.0"),
        discount_pct=Decimal("1.0"),
        gst_pct=Decimal("18.0"),
    )
    # Subtotal = 5,000,000,000.00
    # Overhead (5%) = 250,000,000.00
    # Contingency (3%) = 150,000,000.00
    # Discount (1%) = 50,000,000.00
    # Taxable = 5,350,000,000.00
    # GST (18%) = 963,000,000.00
    # Grand Total = 6,313,000,000.00
    assert res["subtotal"] == Decimal("5000000000.00")
    assert res["overhead_amount"] == Decimal("250000000.00")
    assert res["contingency_amount"] == Decimal("150000000.00")
    assert res["discount_amount"] == Decimal("50000000.00")
    assert res["taxable_amount"] == Decimal("5350000000.00")
    assert res["gst_amount"] == Decimal("963000000.00")
    assert res["grand_total"] == Decimal("6313000000.00")
