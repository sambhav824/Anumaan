"""
Independent Accuracy & Reliability Benchmark Test Suite for Civil Estimation Engine.
All expected values are independently hand-calculated according to authoritative Indian standards:
- IS 1200 (Part 1, 2, 3, 8, 11, 12, 13)
- IS 1786:2008 (Table 1)
- MoRTH Specifications for Road and Bridge Works (5th Revision)
- IRC:SP:19-2001
- GST Council Notifications (Works Contract Services)
"""

import pytest
from decimal import Decimal
from httpx import AsyncClient

from app.core.calculations import (
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
    convert_length_to_m,
    convert_area_to_sqm,
    convert_volume_to_cum,
    FEET_TO_METERS,
    INCHES_TO_METERS,
    SQFT_TO_SQM,
    CUFT_TO_CUM,
    BRASS_TO_CUM,
)


# ==============================================================================
# 1. Independent Building Construction Benchmark
# ==============================================================================
def test_benchmark_building_excavation():
    """
    Pit Excavation Benchmark:
    Dimensions: 4 pits of 3.0m x 2.5m x 1.5m depth.
    Hand-calculated values:
    - In-situ (compacted) volume = 4 * (3.0 * 2.5 * 1.5) = 45.0000 m3
    - Brass equivalent = 45.0000 / 2.8316846592 = 15.8916 brass
    - Swell factor = 15% (0.15)
    - Loose volume = 45.0000 * 1.15 = 51.7500 m3
    - Loose brass = 51.7500 / 2.8316846592 = 18.2753 brass
    """
    # Single pit calculation scaled to 4 pits
    pit = calculate_excavation(length=3.0, width=2.5, depth=1.5, unit='m', swell_factor=0.15)
    assert pit['quantity'] == Decimal('11.2500')
    assert pit['insitu_volume_cum'] == Decimal('11.2500')
    assert pit['loose_volume_cum'] == Decimal('12.9375')  # 11.25 * 1.15
    assert pit['insitu_volume_brass'] == Decimal('3.9729')

    total_insitu = pit['insitu_volume_cum'] * 4
    total_loose = pit['loose_volume_cum'] * 4
    assert total_insitu == Decimal('45.0000')
    assert total_loose == Decimal('51.7500')


def test_benchmark_building_concrete_and_slab():
    """
    PCC & RCC Slab Benchmark:
    - PCC Under Foundation: 4 pits, 3.0m x 2.5m x 0.10m = 3.0000 m3
      With 2% wastage = 3.0000 * 1.02 = 3.0600 m3
    - RCC Roof Slab: 12.0m x 8.0m = 96.0 m2, thickness = 0.15m (150mm)
      Net volume = 96.0 * 0.15 = 14.4000 m3
      With 2.5% wastage = 14.4000 * 1.025 = 14.7600 m3
    """
    pcc = calculate_concrete(length=12.0, width=2.5, thickness=0.10, unit='m', wastage_pct=2.0)
    assert pcc['net_volume_cum'] == Decimal('3.0000')
    assert pcc['gross_volume_cum'] == Decimal('3.0600')
    assert pcc['quantity'] == Decimal('3.0600')

    slab = calculate_slab_concrete(area=96.0, thickness=150, area_unit='sqm', thickness_unit='mm', wastage_pct=2.5)
    assert slab['net_volume_cum'] == Decimal('14.4000')
    assert slab['gross_volume_cum'] == Decimal('14.7600')
    assert slab['quantity'] == Decimal('14.7600')


def test_benchmark_building_brickwork_is1200_deductions():
    """
    Brick Masonry IS 1200 Part 3 Clause 5.2.1 Benchmark:
    Wall: 10.0m length x 3.0m height x 0.23m thickness
    Gross Volume = 10.0 * 3.0 * 0.23 = 6.9000 m3
    Openings:
    1. Door D1: 1.2m x 2.1m = 2.52 m2 (> 0.10 m2) -> Deduct 2.52 * 0.23 = 0.5796 m3
    2. Window W1: 1.5m x 1.2m = 1.80 m2 (> 0.10 m2) -> Deduct 1.80 * 0.23 = 0.4140 m3
    3. Small Vent: 0.25m x 0.25m = 0.0625 m2 (<= 0.10 m2) -> EXEMPT under IS 1200 Clause 5.2.1
    Total deductions = 0.5796 + 0.4140 = 0.9936 m3
    Net volume = 6.9000 - 0.9936 = 5.9064 m3
    Wastage = 3% -> 5.9064 * 1.03 = 6.083592 -> 6.0836 m3
    """
    res = calculate_brickwork(
        length=10.0,
        height=3.0,
        thickness=0.23,
        openings=[
            {'name': 'Door D1', 'length': 1.2, 'height': 2.1, 'count': 1},
            {'name': 'Window W1', 'length': 1.5, 'height': 1.2, 'count': 1},
            {'name': 'Vent V1', 'length': 0.25, 'height': 0.25, 'count': 1},
        ],
        unit='m',
        wastage_pct=3.0,
        ignore_small_openings=True
    )
    assert res['gross_volume_cum'] == Decimal('6.9000')
    assert res['deductions_cum'] == Decimal('0.9936')
    assert res['net_volume_cum'] == Decimal('5.9064')
    assert res['quantity'] == Decimal('6.0836')


def test_benchmark_building_plaster_is1200_boundary_cases():
    """
    Plastering IS 1200 Part 12 Clause 7.2 Boundary Benchmark:
    Wall: 8.0m x 3.0m
    - Case A: Single Face (sides=1)
      Opening 1: 0.5m x 0.8m = 0.40 m2 (<= 0.5 m2 -> 0 deduction)
      Opening 2: 1.0m x 2.1m = 2.10 m2 (0.5 to 3.0 m2 -> 0 deduction on 1 face, jambs compensate)
      Net area = 8.0 * 3.0 = 24.0000 m2
    - Case B: Both Faces (sides=2)
      Opening 1: 0.40 m2 (<= 0.5 m2 -> 0 deduction)
      Opening 2: 2.10 m2 (0.5 to 3.0 m2 -> Deduct 1 face only = 2.1000 m2)
      Opening 3: 2.0m x 2.0m = 4.00 m2 (> 3.0 m2 -> Deduct 2 faces = 8.0000 m2)
      Gross area = 8.0 * 3.0 * 2 = 48.0000 m2
      Deduction = 0 + 2.1000 + 8.0000 = 10.1000 m2
      Net area = 48.0000 - 10.1000 = 37.9000 m2
      With 5% wastage = 37.9000 * 1.05 = 39.7950 m2
    """
    # Single face
    res_1 = calculate_plaster(
        length=8.0,
        height=3.0,
        sides=1,
        openings=[
            {'name': 'Vent', 'width': 0.5, 'height': 0.8},
            {'name': 'Door', 'width': 1.0, 'height': 2.1},
        ],
        unit='m'
    )
    assert res_1['gross_area_sqm'] == Decimal('24.0000')
    assert res_1['deductions_sqm'] == Decimal('0.0000')
    assert res_1['net_area_sqm'] == Decimal('24.0000')

    # Both faces
    res_2 = calculate_plaster(
        length=8.0,
        height=3.0,
        sides=2,
        openings=[
            {'name': 'Vent', 'width': 0.5, 'height': 0.8},
            {'name': 'Door', 'width': 1.0, 'height': 2.1},
            {'name': 'Glass Window', 'width': 2.0, 'height': 2.0},
        ],
        unit='m',
        wastage_pct=5.0
    )
    assert res_2['gross_area_sqm'] == Decimal('48.0000')
    assert res_2['deductions_sqm'] == Decimal('10.1000')
    assert res_2['net_area_sqm'] == Decimal('37.9000')
    assert res_2['quantity'] == Decimal('39.7950')


def test_benchmark_building_flooring_and_painting():
    """
    Flooring (IS 1200 Part 11) & Painting (IS 1200 Part 13) Benchmark:
    - Flooring: 6.0m x 4.5m = 27.0000 m2
      With 5% wastage = 28.3500 m2
      In sqft = 27.0000 * 10.7639104167 = 290.6256 sqft
    - Painting: 100.0 m2, 2 coats @ 9.0 m2/L
      Primary BOQ contract quantity = 100.0000 sqm (NOT litres)
      Litres required = (100 * 2) / 9 = 22.2222 L
    """
    flr = calculate_flooring(length=6.0, width=4.5, unit='m', wastage_pct=5.0)
    assert flr['net_area_sqm'] == Decimal('27.0000')
    assert flr['gross_area_sqm'] == Decimal('28.3500')
    assert flr['quantity'] == Decimal('28.3500')
    assert flr['net_area_sqft'] == Decimal('290.6256')

    pnt = calculate_painting(area=100.0, coats=2, coverage_per_unit=9.0, area_unit='sqm')
    assert pnt['quantity'] == Decimal('100.0000')  # IS 1200 Part 13 primary billing unit
    assert pnt['unit'] == 'sqm'
    assert pnt['litres_required'] == Decimal('22.2222')


def test_benchmark_building_reinforcement_bbs():
    """
    Reinforcement BBS Benchmark:
    - T12: 20 nos, 4.5m length = 90.0m
      * d^2/162 = 90.0 * (144 / 162) = 80.0000 kg
      * IS 1786 Table 1 nominal mass = 90.0 * 0.888 = 79.9200 kg
    - T16: 10 nos, 6.0m length = 60.0m
      * d^2/162 = 60.0 * (256 / 162) = 94.8148 kg
      * IS 1786 Table 1 nominal mass = 60.0 * 1.580 = 94.8000 kg
    """
    bars = [
        {'bar_mark': 'T12 Main', 'diameter_mm': 12, 'length_m': 4.5, 'count': 20},
        {'bar_mark': 'T16 Column', 'diameter_mm': 16, 'length_m': 6.0, 'count': 10},
    ]

    # Standard d^2/162 mode
    res_approx = calculate_reinforcement(bars=bars, wastage_pct=3.0, use_nominal_is_1786=False)
    # Net = 80.0000 + 94.8148 = 174.8148 -> 174.81 kg
    assert res_approx['net_weight_kg'] == Decimal('174.81')
    # Gross = 174.8148 * 1.03 = 180.0592 -> 180.06 kg
    assert res_approx['quantity'] == Decimal('180.06')

    # IS 1786:2008 Table 1 exact nominal mass mode
    res_exact = calculate_reinforcement(bars=bars, wastage_pct=0.0, use_nominal_is_1786=True)
    # Net = 79.9200 + 94.8000 = 174.7200 -> 174.72 kg
    assert res_exact['net_weight_kg'] == Decimal('174.72')
    assert res_exact['quantity'] == Decimal('174.72')


# ==============================================================================
# 2. Independent Road Construction Benchmark (MoRTH 5th Revision)
# ==============================================================================
def test_benchmark_road_layers_compacted_vs_loose():
    """
    MoRTH Section 401 & 406 Benchmark:
    - 1000m length x 7.5m width x 150mm (0.150m) compacted GSB
    - Billable Payment Quantity per MoRTH 401.8 = 1000 * 7.5 * 0.150 = 1125.0000 m3
    - Compacted Brass = 1125.0000 / 2.8316846592 = 397.2900 brass
    - Quarry Truck Loose Factor = 1.25 (25% loose expansion)
    - Loose Material Volume = 1125.0000 * 1.25 = 1406.2500 m3
    - Loose Brass = 1406.2500 / 2.8316846592 = 496.6125 brass
    """
    res = calculate_road_layers(
        length=1000.0,
        width=7.5,
        compacted_thickness=150,
        compaction_factor=1.25,
        unit='m',
        thickness_unit='mm'
    )
    # Payment quantity is in-situ compacted volume per MoRTH
    assert res['quantity'] == Decimal('1125.0000')
    assert res['compacted_volume_cum'] == Decimal('1125.0000')
    assert res['compacted_volume_brass'] == Decimal('397.2900')
    # Truck dispatch loose volume
    assert res['loose_volume_cum'] == Decimal('1406.2500')
    assert res['loose_volume_brass'] == Decimal('496.6125')


def test_benchmark_road_earthwork_average_end_area():
    """
    IRC:SP:19-2001 & MoRTH Section 301.8 Average End Area Benchmark:
    Section 1: A1 = 12.50 m2, A2 = 18.50 m2, D = 30.0m
    Average Area = (12.50 + 18.50) / 2 = 15.50 m2
    Volume = 15.50 * 30.0 = 465.0000 m3
    Brass = 465.0000 / 2.8316846592 = 164.2132 brass
    """
    res = calculate_road_cross_sections(
        area1=12.50,
        area2=18.50,
        distance=30.0,
        area_unit='sqm',
        distance_unit='m'
    )
    assert res['average_area_sqm'] == Decimal('15.5000')
    assert res['volume_cum'] == Decimal('465.0000')
    assert res['volume_brass'] == Decimal('164.2132')
    assert res['quantity'] == Decimal('465.0000')


# ==============================================================================
# 3. Unit Conversion Benchmarks (Imperial, Metric & Brass)
# ==============================================================================
def test_benchmark_unit_conversions():
    # Length conversions
    assert convert_length_to_m(Decimal('1.0'), 'ft') == Decimal('0.3048')
    assert convert_length_to_m(Decimal('12.0'), 'in') == Decimal('0.3048')
    assert convert_length_to_m(Decimal('1000.0'), 'mm') == Decimal('1.0000')
    assert convert_length_to_m(Decimal('100.0'), 'cm') == Decimal('1.0000')

    # Area conversions
    # 100 sq.ft = 9.290304 sqm
    assert convert_area_to_sqm(Decimal('100.0'), 'sqft') == Decimal('9.290304')
    # 1 brass area = 100 sq.ft = 9.290304 sqm
    assert convert_area_to_sqm(Decimal('1.0'), 'brass') == Decimal('9.290304')

    # Volume conversions
    # 100 cu.ft = 2.8316846592 cum
    assert convert_volume_to_cum(Decimal('100.0'), 'cuft') == Decimal('2.8316846592')
    # 1 brass volume = 100 cu.ft = 2.8316846592 cum
    assert convert_volume_to_cum(Decimal('1.0'), 'brass') == Decimal('2.8316846592')


# ==============================================================================
# 4. Monetary Arithmetic & Indian GST Rates Benchmark
# ==============================================================================
def test_benchmark_monetary_and_gst_rates():
    """
    Monetary Breakdown Benchmark:
    Items:
    1. 50.0 cum @ 4500.00 = 225,000.00 INR
    2. 120.0 sqm @ 850.00 = 102,000.00 INR
    Subtotal = 327,000.00 INR
    Overhead 10% = 32,700.00 INR
    Contingency 3% = 9,810.00 INR
    Discount 5% = 16,350.00 INR
    Pre-Tax Subtotal / Taxable Amount = 327,000 + 32,700 + 9,810 - 16,350 = 353,160.00 INR
    """
    items = [
        {'quantity': 50.0, 'unit_rate': 4500.0},
        {'quantity': 120.0, 'unit_rate': 850.0},
    ]

    # Scenario A: 0% GST (Tax-exempt civil works / PMAY affordable housing)
    res_0 = calculate_estimate_totals(items=items, overhead_pct=10.0, contingency_pct=3.0, discount_pct=5.0, gst_pct=0.0)
    assert res_0['subtotal'] == Decimal('327000.00')
    assert res_0['overhead_amount'] == Decimal('32700.00')
    assert res_0['contingency_amount'] == Decimal('9810.00')
    assert res_0['discount_amount'] == Decimal('16350.00')
    assert res_0['pre_tax_subtotal'] == Decimal('353160.00')
    assert res_0['gst_amount'] == Decimal('0.00')
    assert res_0['grand_total'] == Decimal('353160.00')

    # Scenario B: 12% GST (Concessional Govt Infrastructure Works)
    res_12 = calculate_estimate_totals(items=items, overhead_pct=10.0, contingency_pct=3.0, discount_pct=5.0, gst_pct=12.0)
    assert res_12['pre_tax_subtotal'] == Decimal('353160.00')
    assert res_12['gst_amount'] == Decimal('42379.20')  # 353160 * 0.12
    assert res_12['grand_total'] == Decimal('395539.20')

    # Scenario C: 18% GST (Commercial Private Works)
    res_18 = calculate_estimate_totals(items=items, overhead_pct=10.0, contingency_pct=3.0, discount_pct=5.0, gst_pct=18.0)
    assert res_18['pre_tax_subtotal'] == Decimal('353160.00')
    assert res_18['gst_amount'] == Decimal('63568.80')  # 353160 * 0.18
    assert res_18['grand_total'] == Decimal('416728.80')

    # Scenario D: Discount exceeding subtotal (taxable clamped to 0.00)
    res_excess_disc = calculate_estimate_totals(items=items, overhead_pct=0.0, contingency_pct=0.0, discount_pct=150.0, gst_pct=18.0)
    assert res_excess_disc['pre_tax_subtotal'] == Decimal('0.00')
    assert res_excess_disc['gst_amount'] == Decimal('0.00')
    assert res_excess_disc['grand_total'] == Decimal('0.00')


# ==============================================================================
# 5. Boundary Conditions, Missing & Invalid Input Robustness
# ==============================================================================
def test_benchmark_boundary_and_invalid_inputs():
    # Negative dimensions rejected
    with pytest.raises(ValueError, match='strictly positive'):
        calculate_excavation(length=-5.0, width=2.0, depth=1.5)

    with pytest.raises(ValueError, match='strictly positive'):
        calculate_concrete(length=5.0, width=-2.0, thickness=0.15)

    with pytest.raises(ValueError, match='strictly positive'):
        calculate_slab_concrete(area=-50.0, thickness=0.15)

    with pytest.raises(ValueError, match='at least 1'):
        calculate_painting(area=100.0, coats=0)

    # Compaction factor < 1.0 rejected
    with pytest.raises(ValueError, match='Compaction factor cannot be less than 1.0'):
        calculate_road_layers(length=100.0, width=7.0, compacted_thickness=0.15, compaction_factor=0.8)

    # Soil swell < 0 rejected
    with pytest.raises(ValueError, match='cannot be negative'):
        calculate_excavation(length=5.0, width=2.0, depth=1.5, swell_factor=-0.1)

    # Total deductions exceeding gross wall area/volume rejected
    with pytest.raises(ValueError, match='cannot exceed'):
        calculate_brickwork(
            length=3.0,
            height=2.0,
            thickness=0.23,
            openings=[{'length': 4.0, 'height': 3.0, 'count': 1}]  # 12 m2 > 6 m2
        )


# ==============================================================================
# 6. Cross-Organization Tenant Isolation on Calculations and Estimates
# ==============================================================================
@pytest.mark.asyncio
async def test_benchmark_cross_org_authorization(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {'Authorization': f'Bearer {token_a}'}
    headers_b = {'Authorization': f'Bearer {token_b}'}

    # Setup Org A and Org B
    res_a = await client.post('/api/organizations', json={'name': 'Reliance Infra Ltd'}, headers=headers_a)
    org_a_id = res_a.json()['id']

    res_b = await client.post('/api/organizations', json={'name': 'Afcons Infrastructure'}, headers=headers_b)
    org_b_id = res_b.json()['id']

    # Create project and estimate in Org A
    p_a = await client.post(f'/api/organizations/{org_a_id}/projects', json={'name': 'Metro Line 3', 'project_type': 'building'}, headers=headers_a)
    proj_a_id = p_a.json()['id']

    est_a = await client.post(
        f'/api/organizations/{org_a_id}/estimates',
        json={'name': 'TBM Tunnel Estimate', 'project_id': proj_a_id, 'project_type': 'building'},
        headers=headers_a
    )
    assert est_a.status_code == 201
    est_a_id = est_a.json()['id']

    # User B attempts to access Org A estimate -> 403 Forbidden
    cross_get = await client.get(f'/api/organizations/{org_a_id}/estimates/{est_a_id}', headers=headers_b)
    assert cross_get.status_code in (403, 404)

    # User B attempts to calculate in Org A namespace -> 403 Forbidden
    cross_calc = await client.post(
        f'/api/organizations/{org_a_id}/estimates/calculate',
        json={'formula_type': 'excavation', 'length': 10.0, 'width': 5.0, 'depth': 2.0},
        headers=headers_b
    )
    assert cross_calc.status_code in (403, 404)
