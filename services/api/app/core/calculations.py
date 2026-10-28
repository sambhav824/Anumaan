"""
Deterministic Construction Quantity & Civil Estimation Engine
Authoritative Standards Reference:
- IS 1200 (Part I: 1992) - Earthwork
- IS 1200 (Part II: 1974) - Concrete Work
- IS 1200 (Part III: 1976) - Brickwork
- IS 1200 (Part VIII: 1993) - Steel Work & Reinforcement
- IS 1200 (Part XI: 1977) - Paving & Floor Finishes
- IS 1200 (Part XII: 1976) - Plastering & Pointing
- IS 1200 (Part XIII: 1994) - Painting, Varnishing & White Washing
- IS 1786:2008 (Table 1) - High Strength Deformed Steel Bars (Nominal Mass)
- MoRTH Specifications for Road and Bridge Works (5th Revision, Sections 300, 400, 500)
- CPWD Works Manual / DSR (Delhi Schedule of Rates)

All arithmetic uses Python `Decimal` for exact monetary and engineering precision.
"""

from decimal import Decimal, ROUND_HALF_EVEN, ROUND_HALF_UP, InvalidOperation
from typing import List, Dict, Any, Optional, Union


# ------------------------------------------------------------------------------
# Unit Conversion Constants (Exact Standard Definitions)
# ------------------------------------------------------------------------------
# Length: 1 international foot = exactly 0.3048 m
FEET_TO_METERS = Decimal("0.3048")
INCHES_TO_METERS = Decimal("0.0254")
MM_TO_METERS = Decimal("0.001")
CM_TO_METERS = Decimal("0.01")

# Area: 1 sq.ft = 0.3048^2 = 0.09290304 sqm
SQFT_TO_SQM = Decimal("0.09290304")
SQM_TO_SQFT = Decimal("1") / SQFT_TO_SQM  # ~ 10.7639104167

# Volume: 1 cu.ft = 0.3048^3 = 0.028316846592 cum
CUFT_TO_CUM = Decimal("0.028316846592")
CUM_TO_CUFT = Decimal("1") / CUFT_TO_CUM  # ~ 35.3146667215

# Indian Construction Units:
# 1 brass (Volume) = 100 cu.ft = 2.8316846592 cum (Used for earthwork, stone, sand)
# 1 brass (Area) = 100 sq.ft = 9.290304 sqm (Used in Maharashtra/Gujarat for plastering, flooring)
BRASS_TO_CUFT = Decimal("100.0")
BRASS_TO_CUM = Decimal("2.8316846592")
BRASS_AREA_TO_SQFT = Decimal("100.0")
BRASS_AREA_TO_SQM = Decimal("9.290304")

# IS 1786:2008 Table 1 - Nominal Mass per metre for Deformed Steel Bars (kg/m)
IS_1786_NOMINAL_MASS_KG_M: Dict[int, Decimal] = {
    4: Decimal("0.099"),
    5: Decimal("0.154"),
    6: Decimal("0.222"),
    8: Decimal("0.395"),
    10: Decimal("0.617"),
    12: Decimal("0.888"),
    16: Decimal("1.580"),
    20: Decimal("2.470"),
    25: Decimal("3.850"),
    28: Decimal("4.830"),
    32: Decimal("6.310"),
    36: Decimal("7.990"),
    40: Decimal("9.860"),
    45: Decimal("12.500"),
    50: Decimal("15.420"),
}


def to_decimal(val: Any) -> Decimal:
    """Safely converts any numeric input or string to Decimal."""
    if val is None or val == "":
        raise ValueError("Input value cannot be None or empty.")
    try:
        return Decimal(str(val).strip())
    except (InvalidOperation, ValueError):
        raise ValueError(f"Invalid decimal value: '{val}'")


def quantize_qty(val: Decimal, places: int = 4) -> Decimal:
    """Quantizes quantity to 4 decimal places using ROUND_HALF_EVEN."""
    exp = Decimal("10") ** -places
    return val.quantize(exp, rounding=ROUND_HALF_EVEN)


def quantize_currency(val: Decimal) -> Decimal:
    """Quantizes monetary amount to 2 decimal places (cents/paise) using ROUND_HALF_EVEN."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


def convert_length_to_m(val: Decimal, unit: str) -> Decimal:
    """Converts a length dimension from supported units to metres."""
    u = unit.lower().strip()
    if u in ("m", "meter", "meters", "metre", "metres"):
        return val
    elif u in ("mm", "millimeter", "millimeters", "millimetre", "millimetres"):
        return val * MM_TO_METERS
    elif u in ("cm", "centimeter", "centimeters", "centimetre", "centimetres"):
        return val * CM_TO_METERS
    elif u in ("ft", "feet", "foot", "'"):
        return val * FEET_TO_METERS
    elif u in ("in", "inch", "inches", '"'):
        return val * INCHES_TO_METERS
    raise ValueError(f"Unsupported length unit: '{unit}'. Supported: m, mm, cm, ft, in.")


def convert_area_to_sqm(val: Decimal, unit: str) -> Decimal:
    """Converts an area from supported units to square metres."""
    u = unit.lower().strip()
    if u in ("sqm", "m2", "sq_m", "sq.m", "m\xb2"):
        return val
    elif u in ("sqft", "ft2", "sq_ft", "sq.ft", "ft\xb2"):
        return val * SQFT_TO_SQM
    elif u in ("brass", "br", "brass_area"):
        return val * BRASS_AREA_TO_SQM
    raise ValueError(f"Unsupported area unit: '{unit}'. Supported: sqm, sqft, brass.")


def convert_volume_to_cum(val: Decimal, unit: str) -> Decimal:
    """Converts a volume from supported units to cubic metres."""
    u = unit.lower().strip()
    if u in ("cum", "m3", "cu_m", "cu.m", "m\xb3"):
        return val
    elif u in ("cuft", "ft3", "cu_ft", "cu.ft", "ft\xb3"):
        return val * CUFT_TO_CUM
    elif u in ("brass", "br", "brass_volume"):
        return val * BRASS_TO_CUM
    raise ValueError(f"Unsupported volume unit: '{unit}'. Supported: cum, cuft, brass.")


# ------------------------------------------------------------------------------
# 1. Excavation Calculation (IS 1200 Part I: 1992)
# ------------------------------------------------------------------------------
def calculate_excavation(
    length: Any,
    width: Any,
    depth: Any,
    unit: str = "m",
    swell_factor: Any = Decimal("0.0")
) -> Dict[str, Any]:
    """
    Computes earthwork excavation volume.
    Per IS 1200 (Part 1: 1992, Clause 4.1):
    - Billable/Contract quantity is in-situ (pit) measurement in cubic metres.
    - Loose volume (with soil swell) is reported distinctly for haulage, trucking,
      and disposal estimation.
    - Swell factor must be explicit and non-negative.
    """
    L = convert_length_to_m(to_decimal(length), unit)
    W = convert_length_to_m(to_decimal(width), unit)
    D = convert_length_to_m(to_decimal(depth), unit)

    if L <= 0 or W <= 0 or D <= 0:
        raise ValueError("Excavation length, width, and depth must be strictly positive.")

    swell = to_decimal(swell_factor) if swell_factor is not None else Decimal("0.0")
    if swell < 0:
        raise ValueError("Soil swell factor cannot be negative.")

    insitu_vol_cum = L * W * D
    loose_vol_cum = insitu_vol_cum * (Decimal("1") + swell)
    insitu_vol_brass = insitu_vol_cum / BRASS_TO_CUM
    loose_vol_brass = loose_vol_cum / BRASS_TO_CUM

    formula_str = (
        f"In-situ (Compacted) Vol = {L:.3f}m \xd7 {W:.3f}m \xd7 {D:.3f}m = {insitu_vol_cum:.4f} m\xb3 "
        f"({insitu_vol_brass:.3f} Brass)"
    )
    if swell > 0:
        formula_str += (
            f"; Loose Vol ({float(swell*100):.1f}% swell) = {loose_vol_cum:.4f} m\xb3 "
            f"({loose_vol_brass:.3f} Brass)"
        )

    return {
        "quantity": quantize_qty(insitu_vol_cum),  # IS 1200 billable quantity
        "unit": "cum",
        "insitu_volume_cum": quantize_qty(insitu_vol_cum),
        "compacted_volume_cum": quantize_qty(insitu_vol_cum),  # alias for backward compat
        "loose_volume_cum": quantize_qty(loose_vol_cum),
        "insitu_volume_brass": quantize_qty(insitu_vol_brass),
        "compacted_volume_brass": quantize_qty(insitu_vol_brass),  # alias
        "loose_volume_brass": quantize_qty(loose_vol_brass),
        "swell_factor": float(swell),
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 1: 1992, Clause 4.1)",
        "calculation_type": "excavation",
    }


# ------------------------------------------------------------------------------
# 2. Concrete Work (IS 1200 Part II: 1974)
# ------------------------------------------------------------------------------
def calculate_concrete(
    length: Any,
    width: Any,
    thickness: Any,
    unit: str = "m",
    wastage_pct: Any = Decimal("0.0")
) -> Dict[str, Any]:
    """
    Computes concrete volume.
    Per IS 1200 (Part 2: 1974, Clause 4.1):
    - Concrete shall be measured net in cubic metres in position.
    - Wastage is a contractor procurement markup and defaults to 0.0%.
    """
    L = convert_length_to_m(to_decimal(length), unit)
    W = convert_length_to_m(to_decimal(width), unit)
    T = convert_length_to_m(to_decimal(thickness), unit)

    if L <= 0 or W <= 0 or T <= 0:
        raise ValueError("Concrete dimensions must be strictly positive.")

    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    net_vol = L * W * T
    gross_vol = net_vol * (Decimal("1") + (wastage / Decimal("100")))
    net_brass = net_vol / BRASS_TO_CUM

    formula_str = f"Net Concrete = {L:.3f}m \xd7 {W:.3f}m \xd7 {T:.3f}m = {net_vol:.4f} m\xb3 ({net_brass:.3f} Brass)"
    if wastage > 0:
        formula_str += f"; Gross Procurement (+{float(wastage):.1f}% wastage) = {gross_vol:.4f} m\xb3"

    # In construction BOQs, primary billable item is net volume
    return {
        "quantity": quantize_qty(gross_vol if wastage > 0 else net_vol),
        "unit": "cum",
        "net_volume_cum": quantize_qty(net_vol),
        "gross_volume_cum": quantize_qty(gross_vol),
        "net_volume_brass": quantize_qty(net_brass),
        "wastage_pct": float(wastage),
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 2: 1974, Clause 4.1)",
        "calculation_type": "concrete",
    }


# ------------------------------------------------------------------------------
# 3. Slab Concrete (IS 1200 Part II: 1974)
# ------------------------------------------------------------------------------
def calculate_slab_concrete(
    area: Any,
    thickness: Any,
    area_unit: str = "sqm",
    thickness_unit: str = "m",
    wastage_pct: Any = Decimal("0.0")
) -> Dict[str, Any]:
    """
    Computes slab concrete volume from plan area and slab thickness.
    Per IS 1200 (Part 2: 1974, Clause 4.1):
    - Measured net in position.
    """
    A = convert_area_to_sqm(to_decimal(area), area_unit)
    T = convert_length_to_m(to_decimal(thickness), thickness_unit)

    if A <= 0 or T <= 0:
        raise ValueError("Slab area and thickness must be strictly positive.")

    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    net_vol = A * T
    gross_vol = net_vol * (Decimal("1") + (wastage / Decimal("100")))
    net_brass = net_vol / BRASS_TO_CUM

    formula_str = f"Net Slab Concrete = {A:.3f} m\xb2 \xd7 {T:.3f}m = {net_vol:.4f} m\xb3 ({net_brass:.3f} Brass)"
    if wastage > 0:
        formula_str += f"; Gross Procurement (+{float(wastage):.1f}% wastage) = {gross_vol:.4f} m\xb3"

    return {
        "quantity": quantize_qty(gross_vol if wastage > 0 else net_vol),
        "unit": "cum",
        "net_volume_cum": quantize_qty(net_vol),
        "gross_volume_cum": quantize_qty(gross_vol),
        "net_volume_brass": quantize_qty(net_brass),
        "wastage_pct": float(wastage),
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 2: 1974, Clause 4.1)",
        "calculation_type": "slab_concrete",
    }


# ------------------------------------------------------------------------------
# 4. Brickwork / Masonry (IS 1200 Part III: 1976)
# ------------------------------------------------------------------------------
def calculate_brickwork(
    length: Any,
    height: Any,
    thickness: Any,
    openings: Optional[List[Dict[str, Any]]] = None,
    unit: str = "m",
    wastage_pct: Any = Decimal("0.0"),
    ignore_small_openings: bool = True
) -> Dict[str, Any]:
    """
    Computes brickwork volume after opening deductions.
    Per IS 1200 (Part 3: 1976, Clause 5.2.1):
    - No deduction shall be made for openings each up to 0.1 m\xb2 (1000 cm\xb2).
    - Openings exceeding 0.1 m\xb2 shall be deducted in full (L_op \xd7 H_op \xd7 Wall Thickness).
    - If ignore_small_openings is False, user forces deduction of all openings.
    """
    L = convert_length_to_m(to_decimal(length), unit)
    H = convert_length_to_m(to_decimal(height), unit)
    T = convert_length_to_m(to_decimal(thickness), unit)

    if L <= 0 or H <= 0 or T <= 0:
        raise ValueError("Brickwork wall dimensions must be strictly positive.")

    gross_vol = L * H * T
    total_deduction = Decimal("0.0")
    deduction_details = []

    if openings:
        for op in openings:
            op_name = op.get("name") or op.get("description") or "Opening"
            op_unit = op.get("unit", unit)
            op_l = convert_length_to_m(to_decimal(op.get("length", 0)), op_unit)
            op_h = convert_length_to_m(to_decimal(op.get("height", 0)), op_unit)
            cnt = to_decimal(op.get("count", 1))

            if op_l <= 0 or op_h <= 0 or cnt <= 0:
                continue

            op_face_area = op_l * op_h  # area of a single opening

            # IS 1200 Part III Clause 5.2.1: Openings each up to 0.1 m2 are exempt from deduction
            if ignore_small_openings and op_face_area <= Decimal("0.10"):
                deduction_details.append(
                    f"{op_name}: {float(cnt):.0f}x ({op_l:.2f}\xd7{op_h:.2f}m = {op_face_area:.3f}m\xb2 \u2264 0.10m\xb2: Exempt under IS 1200 Part 3)"
                )
                continue

            op_vol = op_face_area * T * cnt
            total_deduction += op_vol
            deduction_details.append(
                f"{op_name}: {float(cnt):.0f}x ({op_l:.2f}\xd7{op_h:.2f}\xd7{T:.2f}m = {op_vol:.4f}m\xb3 deducted)"
            )

    if total_deduction > gross_vol:
        raise ValueError("Total opening deductions cannot exceed wall gross volume.")

    net_vol = gross_vol - total_deduction
    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    gross_with_waste = net_vol * (Decimal("1") + (wastage / Decimal("100")))

    formula_str = (
        f"Gross Vol ({L:.3f}m \xd7 {H:.3f}m \xd7 {T:.3f}m = {gross_vol:.4f} m\xb3)"
        f" - Deductions ({total_deduction:.4f} m\xb3)"
        f" = {net_vol:.4f} m\xb3 net"
    )
    if wastage > 0:
        formula_str += f" + {float(wastage):.1f}% wastage = {gross_with_waste:.4f} m\xb3"

    return {
        "quantity": quantize_qty(gross_with_waste if wastage > 0 else net_vol),
        "unit": "cum",
        "gross_volume_cum": quantize_qty(gross_vol),
        "deductions_cum": quantize_qty(total_deduction),
        "net_volume_cum": quantize_qty(net_vol),
        "net_volume_brass": quantize_qty(net_vol / BRASS_TO_CUM),
        "wastage_pct": float(wastage),
        "openings_breakdown": deduction_details,
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 3: 1976, Clause 5.2.1)",
        "calculation_type": "brickwork",
    }


# ------------------------------------------------------------------------------
# 5. Plastering (IS 1200 Part XII: 1976)
# ------------------------------------------------------------------------------
def calculate_plaster(
    length: Any,
    height: Any,
    sides: int = 1,
    openings: Optional[List[Dict[str, Any]]] = None,
    unit: str = "m",
    wastage_pct: Any = Decimal("0.0")
) -> Dict[str, Any]:
    """
    Computes plastering net area in square metres after openings deductions.
    Per IS 1200 (Part 12: 1976, Clause 7.2):
    - Area of opening up to 0.5 m\xb2:
        No deduction is made, and no addition is made for jambs, soffits, sills.
    - Area of opening exceeding 0.5 m\xb2 and up to 3.0 m\xb2:
        * When both faces are plastered (sides == 2):
          Deduction is made for ONE face only (i.e. 1.0 \xd7 opening area),
          and no addition is made for jambs, soffits, sills.
        * When only one face is plastered (sides == 1):
          No deduction is made, and no addition is made for jambs, soffits, sills.
    - Area of opening exceeding 3.0 m\xb2:
        Deduction is made on both faces (or the plastered face), and jambs/soffits/sills
        are measured and added separately if specified.
    """
    L = convert_length_to_m(to_decimal(length), unit)
    H = convert_length_to_m(to_decimal(height), unit)

    if L <= 0 or H <= 0:
        raise ValueError("Plaster wall dimensions must be strictly positive.")
    if sides not in (1, 2):
        raise ValueError("Plaster sides must be 1 (single face) or 2 (both faces).")

    gross_area = L * H * Decimal(sides)
    total_deduction = Decimal("0.0")
    deduction_details = []

    if openings:
        for op in openings:
            op_name = op.get("name") or op.get("description") or "Opening"
            op_unit = op.get("unit", unit)
            op_w = convert_length_to_m(to_decimal(op.get("width") or op.get("length", 0)), op_unit)
            op_h = convert_length_to_m(to_decimal(op.get("height", 0)), op_unit)
            cnt = to_decimal(op.get("count", 1))

            if op_w <= 0 or op_h <= 0 or cnt <= 0:
                continue

            single_op_area = op_w * op_h
            total_op_area = single_op_area * cnt

            custom_pct = op.get("deduction_pct")
            if custom_pct is not None:
                pct = to_decimal(custom_pct) / Decimal("100.0")
                ded = total_op_area * pct * Decimal(sides)
                rule_desc = f"Custom {float(pct*100):.0f}% deduction"
            else:
                # Automated IS 1200 Part XII Clause 7.2 Rules
                if single_op_area <= Decimal("0.5"):
                    # Clause 7.2.1: No deduction for opening <= 0.5 sqm
                    ded = Decimal("0.0")
                    rule_desc = "Area \u2264 0.5 m\xb2: No deduction (IS 1200 7.2.1)"
                elif single_op_area <= Decimal("3.0"):
                    # Clause 7.2.2:
                    if sides == 2:
                        # Deduction for one face only (1.0 x opening area)
                        ded = total_op_area * Decimal("1.0")
                        rule_desc = "0.5 to 3.0 m\xb2 on 2 faces: Deduct 1 face only (IS 1200 7.2.2)"
                    else:
                        # Only 1 face plastered: No deduction
                        ded = Decimal("0.0")
                        rule_desc = "0.5 to 3.0 m\xb2 on 1 face: No deduction (IS 1200 7.2.2)"
                else:
                    # Clause 7.2.3: Exceeding 3.0 sqm: deduct for both faces (or the plastered face)
                    ded = total_op_area * Decimal(sides)
                    rule_desc = f"> 3.0 m\xb2: Full deduction on {sides} face(s) (IS 1200 7.2.3)"

            total_deduction += ded
            deduction_details.append(
                f"{op_name}: {float(cnt):.0f}x ({op_w:.2f}\xd7{op_h:.2f}m = {single_op_area:.3f}m\xb2) -> {rule_desc} = {ded:.3f}m\xb2 deducted"
            )

    if total_deduction > gross_area:
        raise ValueError("Total opening deductions cannot exceed plaster gross area.")

    net_area = gross_area - total_deduction
    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    gross_with_waste = net_area * (Decimal("1") + (wastage / Decimal("100")))

    formula_str = (
        f"Gross Area ({L:.3f}m \xd7 {H:.3f}m \xd7 {sides} face{'s' if sides>1 else ''} = {gross_area:.3f} m\xb2)"
        f" - Deductions ({total_deduction:.3f} m\xb2)"
        f" = {net_area:.3f} m\xb2 net"
    )
    if wastage > 0:
        formula_str += f" + {float(wastage):.1f}% wastage = {gross_with_waste:.3f} m\xb2"

    return {
        "quantity": quantize_qty(gross_with_waste if wastage > 0 else net_area),
        "unit": "sqm",
        "gross_area_sqm": quantize_qty(gross_area),
        "deductions_sqm": quantize_qty(total_deduction),
        "net_area_sqm": quantize_qty(net_area),
        "net_area_sqft": quantize_qty(net_area * SQM_TO_SQFT),
        "wastage_pct": float(wastage),
        "openings_breakdown": deduction_details,
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 12: 1976, Clause 7.2)",
        "calculation_type": "plaster",
    }


# ------------------------------------------------------------------------------
# 6. Flooring (IS 1200 Part XI: 1977)
# ------------------------------------------------------------------------------
def calculate_flooring(
    length: Optional[Any] = None,
    width: Optional[Any] = None,
    area: Optional[Any] = None,
    unit: str = "m",
    area_unit: str = "sqm",
    wastage_pct: Any = Decimal("0.0")
) -> Dict[str, Any]:
    """
    Computes flooring area in square metres.
    Per IS 1200 (Part 11: 1977, Clause 4.1):
    - Measured net in square metres between unplastered wall faces.
    - Wastage is explicit contractor cutting allowance, default 0.0%.
    """
    if area is not None and area != "":
        net_area = convert_area_to_sqm(to_decimal(area), area_unit)
    elif length is not None and width is not None:
        L = convert_length_to_m(to_decimal(length), unit)
        W = convert_length_to_m(to_decimal(width), unit)
        if L <= 0 or W <= 0:
            raise ValueError("Flooring length and width must be strictly positive.")
        net_area = L * W
    else:
        raise ValueError("Either area or both length and width must be provided.")

    if net_area <= 0:
        raise ValueError("Flooring net area must be strictly positive.")

    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    gross_area = net_area * (Decimal("1") + (wastage / Decimal("100")))
    formula_str = f"Net Flooring Area: {net_area:.3f} m\xb2 ({float(net_area * SQM_TO_SQFT):.2f} sq.ft)"
    if wastage > 0:
        formula_str += f" + {float(wastage):.1f}% wastage = {gross_area:.3f} m\xb2 ({float(gross_area * SQM_TO_SQFT):.2f} sq.ft)"

    return {
        "quantity": quantize_qty(gross_area if wastage > 0 else net_area),
        "unit": "sqm",
        "net_area_sqm": quantize_qty(net_area),
        "gross_area_sqm": quantize_qty(gross_area),
        "net_area_sqft": quantize_qty(net_area * SQM_TO_SQFT),
        "gross_area_sqft": quantize_qty(gross_area * SQM_TO_SQFT),
        "wastage_pct": float(wastage),
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 11: 1977, Clause 4.1)",
        "calculation_type": "flooring",
    }


# ------------------------------------------------------------------------------
# 7. Painting (IS 1200 Part XIII: 1994)
# ------------------------------------------------------------------------------
def calculate_painting(
    area: Any,
    coats: int = 2,
    coverage_per_unit: Any = Decimal("10.0"),  # Manufacturer coverage (e.g. 10 sqm / litre)
    area_unit: str = "sqm"
) -> Dict[str, Any]:
    """
    Computes painting work quantities.
    Per IS 1200 (Part 13: 1994, Clause 4.1):
    - BOQ contract billing quantity is surface area in square metres (sqm).
    - Litres required is a material consumption procurement figure calculated as:
      Litres = (Area \xd7 Coats) \xf7 Coverage per Litre.
    """
    A = convert_area_to_sqm(to_decimal(area), area_unit)
    if A <= 0:
        raise ValueError("Painting surface area must be strictly positive.")
    if coats < 1:
        raise ValueError("Number of coats must be at least 1.")

    coverage = to_decimal(coverage_per_unit)
    if coverage <= 0:
        raise ValueError("Paint coverage per unit must be strictly positive.")

    total_coat_area = A * Decimal(coats)
    litres_required = total_coat_area / coverage

    formula_str = (
        f"Surface Area: {A:.2f} m\xb2; for {coats} coats @ {coverage:.1f} m\xb2/L "
        f"= {litres_required:.2f} Litres required"
    )

    return {
        "quantity": quantize_qty(A),  # Primary BOQ contract item is surface area in sqm
        "unit": "sqm",
        "paintable_area_sqm": quantize_qty(A),
        "paintable_area_sqft": quantize_qty(A * SQM_TO_SQFT),
        "coats": coats,
        "litres_required": quantize_qty(litres_required),
        "liters_required": quantize_qty(litres_required),
        "coverage_per_unit": float(coverage),
        "formula": formula_str,
        "standard_reference": "IS 1200 (Part 13: 1994, Clause 4.1)",
        "calculation_type": "painting",
    }


# ------------------------------------------------------------------------------
# 8. Reinforcement / Steel BBS (IS 1786:2008 & SP 34:1987)
# ------------------------------------------------------------------------------
def calculate_reinforcement(
    bars: List[Dict[str, Any]],
    wastage_pct: Any = Decimal("0.0"),
    use_nominal_is_1786: bool = False
) -> Dict[str, Any]:
    """
    Computes reinforcement steel weight from Bar Bending Schedule (BBS).
    Per IS 1786:2008 Table 1:
    - Standard deformed bars have defined nominal mass per metre.
    - If bar diameter is in IS 1786 Table 1, exact nominal mass is used.
    - Otherwise (or if use_nominal_is_1786 is False), the standard engineering
      approximation formula (d^2 / 162.0 kg/m) is used.
    """
    if not bars:
        raise ValueError("Bar details list cannot be empty for reinforcement calculation.")

    wastage = to_decimal(wastage_pct) if wastage_pct is not None else Decimal("0.0")
    if wastage < 0:
        raise ValueError("Wastage percentage cannot be negative.")

    total_net_weight_kg = Decimal("0.0")
    breakdown_list = []

    for b in bars:
        bar_mark = b.get("bar_mark") or b.get("description") or "Bar"
        dia = to_decimal(b.get("diameter_mm") or b.get("diameter", 0))
        length = to_decimal(b.get("length_m") or b.get("length", 0))
        count = to_decimal(b.get("count") or b.get("num_bars", 1))

        if dia <= 0 or length <= 0 or count <= 0:
            raise ValueError(f"Bar '{bar_mark}': diameter, length, and count must be strictly positive.")

        int_dia = int(dia)
        if use_nominal_is_1786 and int_dia in IS_1786_NOMINAL_MASS_KG_M and dia == int_dia:
            unit_weight_kg_m = IS_1786_NOMINAL_MASS_KG_M[int_dia]
            method = "IS 1786 Table 1"
        else:
            # Approximate d^2 / 162 kg/m
            unit_weight_kg_m = (dia * dia) / Decimal("162.0")
            method = "d\xb2/162"

        total_bar_len = length * count
        bar_weight_kg = total_bar_len * unit_weight_kg_m
        total_net_weight_kg += bar_weight_kg

        breakdown_list.append(
            f"{bar_mark} (\u03a6{float(dia):.0f}mm): {float(count):.0f} nos \xd7 {float(length):.2f}m = "
            f"{float(total_bar_len):.2f}m @ {float(unit_weight_kg_m):.4f} kg/m ({method}) = {float(bar_weight_kg):.2f} kg"
        )

    gross_weight_kg = total_net_weight_kg * (Decimal("1") + (wastage / Decimal("100")))
    gross_weight_tonne = gross_weight_kg / Decimal("1000.0")

    formula_str = (
        f"Net Steel = {float(total_net_weight_kg):.2f} kg ({float(total_net_weight_kg/Decimal('1000')):.4f} MT)"
    )
    if wastage > 0:
        formula_str += f" + {float(wastage):.1f}% wastage = {float(gross_weight_kg):.2f} kg ({float(gross_weight_tonne):.4f} MT)"

    return {
        "quantity": quantize_qty(gross_weight_kg if wastage > 0 else total_net_weight_kg, places=2),
        "unit": "kg",
        "net_weight_kg": quantize_qty(total_net_weight_kg, places=2),
        "gross_weight_kg": quantize_qty(gross_weight_kg, places=2),
        "net_weight_tonne": quantize_qty(total_net_weight_kg / Decimal("1000.0"), places=4),
        "gross_weight_tonne": quantize_qty(gross_weight_tonne, places=4),
        "wastage_pct": float(wastage),
        "bars_breakdown": breakdown_list,
        "formula": formula_str,
        "standard_reference": "IS 1786:2008 Table 1 & SP 34:1987",
        "calculation_type": "reinforcement",
    }


# ------------------------------------------------------------------------------
# 9. Road Layers (MoRTH 5th Revision, Sections 400 & 500)
# ------------------------------------------------------------------------------
def calculate_road_layers(
    length: Any,
    width: Any,
    compacted_thickness: Any,
    compaction_factor: Any = Decimal("1.0"),
    unit: str = "m",
    thickness_unit: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes road pavement layer quantities (Subbase, WMM, DBM, BC).
    Per MoRTH (5th Rev, Clauses 401.8, 406.8, 505.8):
    - Pavement layers are measured and paid in cubic metres of COMPACTED VOLUME in place.
    - Loose volume (using compaction factor e.g. 1.20 to 1.25 for WMM/GSB) is reported
      for quarry truck dispatch and material haulage.
    """
    raw_thick = to_decimal(compacted_thickness)
    if thickness_unit:
        T = convert_length_to_m(raw_thick, thickness_unit)
    elif raw_thick >= Decimal("1.0") and unit.lower().strip() in ("m", "meter", "meters", "metre", "metres"):
        # Civil Engineering standard: Layer thickness >= 1.0 without unit in road context is millimetres
        T = raw_thick * MM_TO_METERS
    else:
        T = convert_length_to_m(raw_thick, unit)

    L = convert_length_to_m(to_decimal(length), unit)
    W = convert_length_to_m(to_decimal(width), unit)

    if L <= 0 or W <= 0 or T <= 0:
        raise ValueError("Road layer length, width, and thickness must be strictly positive.")

    comp_factor = to_decimal(compaction_factor) if compaction_factor is not None else Decimal("1.0")
    if comp_factor < Decimal("1.0"):
        raise ValueError("Compaction factor cannot be less than 1.0 (loose volume is greater than or equal to compacted volume).")

    compacted_vol = L * W * T
    loose_vol = compacted_vol * comp_factor
    compacted_brass = compacted_vol / BRASS_TO_CUM
    loose_brass = loose_vol / BRASS_TO_CUM

    formula_str = (
        f"Compacted Layer = {L:.2f}m \xd7 {W:.2f}m \xd7 {T:.3f}m = {compacted_vol:.3f} m\xb3 "
        f"({compacted_brass:.3f} Brass)"
    )
    if comp_factor > Decimal("1.0"):
        formula_str += (
            f"; Loose Material ({float(comp_factor):.2f}x factor) = {loose_vol:.3f} m\xb3 "
            f"({loose_brass:.3f} Brass)"
        )

    return {
        "quantity": quantize_qty(compacted_vol),  # MoRTH contract payment measurement
        "unit": "cum",
        "compacted_volume_cum": quantize_qty(compacted_vol),
        "loose_volume_cum": quantize_qty(loose_vol),
        "compacted_volume_brass": quantize_qty(compacted_brass),
        "loose_volume_brass": quantize_qty(loose_brass),
        "compaction_factor": float(comp_factor),
        "formula": formula_str,
        "standard_reference": "MoRTH (5th Revision, Clauses 401.8, 406.8)",
        "calculation_type": "road_layers",
    }


def calculate_road_area(
    length: Any,
    width: Any,
    unit: str = "m"
) -> Dict[str, Any]:
    """Computes carriageway or road corridor surface area per MoRTH Section 201."""
    L = convert_length_to_m(to_decimal(length), unit)
    W = convert_length_to_m(to_decimal(width), unit)
    if L <= 0 or W <= 0:
        raise ValueError("Road length and width must be strictly positive.")

    area_sqm = L * W
    area_sqft = area_sqm * SQM_TO_SQFT
    formula_str = f"Road Area = Length ({L:.2f}m) \xd7 Width ({W:.2f}m) = {area_sqm:.2f} sqm ({area_sqft:.2f} sq.ft)"

    return {
        "quantity": quantize_qty(area_sqm),
        "unit": "sqm",
        "area_sqm": quantize_qty(area_sqm),
        "area_sqft": quantize_qty(area_sqft),
        "formula": formula_str,
        "standard_reference": "MoRTH Section 201 & IRC Standard Specifications",
        "calculation_type": "road_area",
    }


def calculate_road_earthwork(
    length: Any,
    width: Any,
    depth: Any,
    cut_or_fill: str = "cut",
    unit: str = "m"
) -> Dict[str, Any]:
    """Computes road cut or fill excavation quantities per MoRTH Section 301."""
    L = convert_length_to_m(to_decimal(length), unit)
    W = convert_length_to_m(to_decimal(width), unit)
    D = convert_length_to_m(to_decimal(depth), unit)
    if L <= 0 or W <= 0 or D <= 0:
        raise ValueError("Road earthwork length, width, and depth must be strictly positive.")

    vol_cum = L * W * D
    vol_brass = vol_cum / BRASS_TO_CUM
    action = "Embankment Fill" if cut_or_fill == "fill" else "Roadway Cut Excavation"
    formula_str = f"Road Earthwork ({action}) = {L:.2f}m \xd7 {W:.2f}m \xd7 {D:.2f}m = {vol_cum:.2f} cum ({vol_brass:.2f} Brass)"

    return {
        "quantity": quantize_qty(vol_cum),
        "unit": "cum",
        "volume_cum": quantize_qty(vol_cum),
        "volume_brass": quantize_qty(vol_brass),
        "cut_or_fill": cut_or_fill,
        "formula": formula_str,
        "standard_reference": "MoRTH Section 301 (Roadway Excavation & Embankment)",
        "calculation_type": "road_earthwork",
    }


# ------------------------------------------------------------------------------
# 10. Road Cross-Sections (Average End Area)
# ------------------------------------------------------------------------------
def calculate_road_cross_sections(
    area1: Any,
    area2: Any,
    distance: Any,
    area_unit: str = "sqm",
    distance_unit: str = "m"
) -> Dict[str, Any]:
    """
    Computes earthwork cut/fill volume between two successive cross sections
    using the Average End Area method.
    Per IRC:SP:19-2001 and MoRTH Section 301.8:
    V = ((A1 + A2) / 2) * Distance.
    """
    A1 = convert_area_to_sqm(to_decimal(area1), area_unit)
    A2 = convert_area_to_sqm(to_decimal(area2), area_unit)
    D = convert_length_to_m(to_decimal(distance), distance_unit)

    if A1 < 0 or A2 < 0 or D <= 0:
        raise ValueError("Cross-section areas must be non-negative and distance must be strictly positive.")
    if A1 == 0 and A2 == 0:
        raise ValueError("Both cross-section areas cannot be zero simultaneously.")

    avg_area = (A1 + A2) / Decimal("2.0")
    volume = avg_area * D
    brass = volume / BRASS_TO_CUM

    formula_str = (
        f"Avg End Area [({A1:.2f} + {A2:.2f}) / 2 = {avg_area:.2f} m\xb2] "
        f"\xd7 Distance ({D:.2f}m) = {volume:.3f} m\xb3 ({brass:.3f} Brass)"
    )

    return {
        "quantity": quantize_qty(volume),
        "unit": "cum",
        "average_area_sqm": quantize_qty(avg_area),
        "volume_cum": quantize_qty(volume),
        "volume_brass": quantize_qty(brass),
        "formula": formula_str,
        "standard_reference": "IRC:SP:19-2001 & MoRTH Section 301.8",
        "calculation_type": "road_cross_sections",
    }


# ------------------------------------------------------------------------------
# 11. Totals, Overheads, Taxes Arithmetic (Exact Decimal & No Silent Tax Defaults)
# ------------------------------------------------------------------------------
def calculate_estimate_totals(
    items: List[Dict[str, Any]],
    overhead_pct: Any = Decimal("0.0"),
    contingency_pct: Any = Decimal("0.0"),
    discount_pct: Any = Decimal("0.0"),
    gst_pct: Any = Decimal("0.0")  # Explicitly default to 0.0 (NO silent universal tax assumption)
) -> Dict[str, Decimal]:
    """
    Computes formal estimate totals.
    - Pre-tax subtotal is preserved cleanly.
    - Overhead & Contingency added to subtotal.
    - Discount deducted.
    - Taxable amount calculated.
    - GST applied strictly on the taxable amount if specified.
    """
    subtotal = Decimal("0.0")
    for item in items:
        qty = to_decimal(item.get("quantity", 0))
        rate = to_decimal(item.get("unit_rate", 0))
        if qty < 0 or rate < 0:
            raise ValueError("Item quantity and unit rate cannot be negative.")
        item_amount = quantize_currency(qty * rate)
        subtotal += item_amount

    subtotal = quantize_currency(subtotal)
    oh_pct = to_decimal(overhead_pct) if overhead_pct is not None else Decimal("0.0")
    cont_pct = to_decimal(contingency_pct) if contingency_pct is not None else Decimal("0.0")
    disc_pct = to_decimal(discount_pct) if discount_pct is not None else Decimal("0.0")
    tax_pct = to_decimal(gst_pct) if gst_pct is not None else Decimal("0.0")

    if oh_pct < 0 or cont_pct < 0 or disc_pct < 0 or tax_pct < 0:
        raise ValueError("Overhead, contingency, discount, and tax percentages cannot be negative.")

    overhead_amount = quantize_currency(subtotal * (oh_pct / Decimal("100.0")))
    contingency_amount = quantize_currency(subtotal * (cont_pct / Decimal("100.0")))
    discount_amount = quantize_currency(subtotal * (disc_pct / Decimal("100.0")))

    # Taxable amount (Pre-tax total)
    taxable_amount = quantize_currency(subtotal + overhead_amount + contingency_amount - discount_amount)
    if taxable_amount < Decimal("0.0"):
        taxable_amount = Decimal("0.00")

    gst_amount = quantize_currency(taxable_amount * (tax_pct / Decimal("100.0")))
    grand_total = quantize_currency(taxable_amount + gst_amount)

    return {
        "subtotal": subtotal,
        "overhead_amount": overhead_amount,
        "contingency_amount": contingency_amount,
        "discount_amount": discount_amount,
        "pre_tax_subtotal": taxable_amount,
        "taxable_amount": taxable_amount,
        "gst_amount": gst_amount,
        "grand_total": grand_total,
    }


# ------------------------------------------------------------------------------
# 12. Measurement-Based Calculation Helpers (Length, Area, Volume, Wall Area, etc.)
# ------------------------------------------------------------------------------
def calculate_length(length: Any, unit: str = "m") -> Dict[str, Any]:
    """Calculates linear length quantity."""
    L = to_decimal(length)
    if L <= 0:
        raise ValueError("Length must be strictly positive.")
    u = unit.lower().strip()
    norm_unit = "m" if u in ("m", "meter", "metre") else "ft" if u in ("ft", "feet", "foot") else u
    formula_str = f"Length = {L:.3f} {norm_unit}"
    return {
        "quantity": quantize_qty(L),
        "unit": norm_unit,
        "formula": formula_str,
        "calculation_type": "length",
        "standard_reference": "Direct Linear Measurement",
    }


def calculate_area(length: Any, width: Any, unit: str = "m") -> Dict[str, Any]:
    """Calculates rectangular plan area: Quantity = Length × Width."""
    L = to_decimal(length)
    W = to_decimal(width)
    if L <= 0 or W <= 0:
        raise ValueError("Length and width must be strictly positive.")
    u = unit.lower().strip()
    area = L * W
    area_unit = "sqm" if u in ("m", "meter", "metre", "sqm") else "sqft"
    dim_unit = "m" if area_unit == "sqm" else "ft"
    formula_str = f"Area = {L:.3f}{dim_unit} \xd7 {W:.3f}{dim_unit} = {area:.4f} {area_unit}"
    return {
        "quantity": quantize_qty(area),
        "unit": area_unit,
        "formula": formula_str,
        "length": float(L),
        "width": float(W),
        "calculation_type": "area",
        "standard_reference": "Direct Area Measurement (L \xd7 W)",
    }


def calculate_volume(length: Any, width: Any, height: Any, unit: str = "m") -> Dict[str, Any]:
    """Calculates 3D volume: Quantity = Length × Width × Height."""
    L = to_decimal(length)
    W = to_decimal(width)
    H = to_decimal(height)
    if L <= 0 or W <= 0 or H <= 0:
        raise ValueError("Length, width, and height must be strictly positive.")
    u = unit.lower().strip()
    vol = L * W * H
    vol_unit = "cum" if u in ("m", "meter", "metre", "cum") else "cuft"
    dim_unit = "m" if vol_unit == "cum" else "ft"
    formula_str = f"Volume = {L:.3f}{dim_unit} \xd7 {W:.3f}{dim_unit} \xd7 {H:.3f}{dim_unit} = {vol:.4f} {vol_unit}"
    return {
        "quantity": quantize_qty(vol),
        "unit": vol_unit,
        "formula": formula_str,
        "length": float(L),
        "width": float(W),
        "height": float(H),
        "calculation_type": "volume",
        "standard_reference": "Direct Volume Measurement (L \xd7 W \xd7 H)",
    }


def calculate_wall_area(
    length: Any,
    height: Any,
    openings: Optional[List[Dict[str, Any]]] = None,
    unit: str = "m"
) -> Dict[str, Any]:
    """
    Calculates rectangular wall net area:
    Gross Wall Area = Length × Height
    Net Wall Area = Gross Wall Area − Door & Window Opening Areas
    """
    L = to_decimal(length)
    H = to_decimal(height)
    if L <= 0 or H <= 0:
        raise ValueError("Wall length and height must be strictly positive.")

    u = unit.lower().strip()
    area_unit = "sqm" if u in ("m", "meter", "metre", "sqm") else "sqft"
    dim_unit = "m" if area_unit == "sqm" else "ft"

    gross_area = L * H
    total_deduction = Decimal("0.0")
    deduction_details = []

    if openings:
        for op in openings:
            op_name = op.get("name") or op.get("description") or "Opening"
            op_w = to_decimal(op.get("width") or op.get("length", 0))
            op_h = to_decimal(op.get("height", 0))
            cnt = to_decimal(op.get("count", 1))

            if op_w <= 0 or op_h <= 0 or cnt <= 0:
                continue

            op_area = op_w * op_h * cnt
            total_deduction += op_area
            deduction_details.append(
                f"{op_name}: {float(cnt):.0f}x ({op_w:.2f}\xd7{op_h:.2f}{dim_unit} = {op_area:.3f} {area_unit})"
            )

    if total_deduction > gross_area:
        raise ValueError("Total opening deductions cannot exceed wall gross area.")

    net_area = gross_area - total_deduction
    formula_str = (
        f"Gross Wall ({L:.2f}{dim_unit} \xd7 {H:.2f}{dim_unit} = {gross_area:.2f} {area_unit})"
        f" - Openings ({total_deduction:.2f} {area_unit}) = {net_area:.2f} {area_unit} net"
    )

    return {
        "quantity": quantize_qty(net_area),
        "unit": area_unit,
        "gross_area": quantize_qty(gross_area),
        "deductions": quantize_qty(total_deduction),
        "net_area": quantize_qty(net_area),
        "openings_breakdown": deduction_details,
        "formula": formula_str,
        "calculation_type": "wall_area",
        "standard_reference": "Net Wall Area = Gross Area - Openings Deductions",
    }


def calculate_count(count: Any, unit: str = "nos") -> Dict[str, Any]:
    """Calculates piece or unit count."""
    C = to_decimal(count)
    if C <= 0:
        raise ValueError("Count must be strictly positive.")
    formula_str = f"Count = {float(C):.0f} {unit}"
    return {
        "quantity": quantize_qty(C, places=2),
        "unit": unit,
        "formula": formula_str,
        "calculation_type": "count",
        "standard_reference": "Unit / Piece Count",
    }


def calculate_weight(weight: Any, unit: str = "kg") -> Dict[str, Any]:
    """Calculates material weight in kg or tonnes."""
    W = to_decimal(weight)
    if W <= 0:
        raise ValueError("Weight must be strictly positive.")
    formula_str = f"Weight = {W:.2f} {unit}"
    return {
        "quantity": quantize_qty(W, places=2),
        "unit": unit,
        "formula": formula_str,
        "calculation_type": "weight",
        "standard_reference": "Weight Measurement",
    }


def calculate_time(duration: Any, unit: str = "day") -> Dict[str, Any]:
    """Calculates labour/equipment time in hours or days."""
    D = to_decimal(duration)
    if D <= 0:
        raise ValueError("Duration must be strictly positive.")
    formula_str = f"Time = {D:.2f} {unit}"
    return {
        "quantity": quantize_qty(D, places=2),
        "unit": unit,
        "formula": formula_str,
        "calculation_type": "time",
        "standard_reference": "Time / Work Duration",
    }


def calculate_lump_sum(description: Optional[str] = None) -> Dict[str, Any]:
    """Calculates fixed lump sum item."""
    desc = description or "Lump sum specified work"
    return {
        "quantity": Decimal("1.0000"),
        "unit": "ls",
        "formula": f"Lump Sum: {desc}",
        "calculation_type": "lump_sum",
        "standard_reference": "Fixed Lump Sum (Scope Defined)",
    }



# ------------------------------------------------------------------------------
# Quick Estimate & Boundary Wall Civil Estimation Engines
# ------------------------------------------------------------------------------

def calculate_quick_building_estimate(
    built_up_area_sqft: Any,
    floors: int = 1,
    quality_tier: str = "standard",
    region_id: str = "national_cpwd",
) -> Dict[str, Any]:
    """
    Calculates quick preliminary building budget and material consumption using
    standard Indian civil engineering benchmarks (CPWD/State PWD building cost indices).
    """
    area = to_decimal(built_up_area_sqft)
    if area <= 0:
        raise ValueError("Built-up area must be strictly positive.")
    num_floors = max(1, int(floors))
    total_area = area * Decimal(num_floors)
    q = quality_tier.lower().strip()

    # Cost coefficients per sq.ft based on regional CSR indices
    rates_matrix = {
        "maharashtra_pwd": {"economy": Decimal("1550.00"), "standard": Decimal("2100.00"), "luxury": Decimal("2950.00")},
        "karnataka_pwd": {"economy": Decimal("1500.00"), "standard": Decimal("2050.00"), "luxury": Decimal("2900.00")},
        "national_cpwd": {"economy": Decimal("1450.00"), "standard": Decimal("1950.00"), "luxury": Decimal("2800.00")},
    }
    reg_rates = rates_matrix.get(region_id, rates_matrix["national_cpwd"])
    cost_per_sqft = reg_rates.get(q, reg_rates["standard"])
    total_cost = quantize_currency(total_area * cost_per_sqft)

    # Material consumption factors per sq.ft
    if q == "economy":
        cement_factor = Decimal("0.40")  # bags/sqft
        steel_factor = Decimal("3.20")   # kg/sqft
        sand_factor = Decimal("1.50")    # cuft/sqft
        agg_factor = Decimal("1.20")     # cuft/sqft
        brick_factor = Decimal("16")     # bricks/sqft
    elif q == "luxury":
        cement_factor = Decimal("0.52")
        steel_factor = Decimal("4.80")
        sand_factor = Decimal("2.00")
        agg_factor = Decimal("1.60")
        brick_factor = Decimal("22")
    else:  # standard
        cement_factor = Decimal("0.45")
        steel_factor = Decimal("3.80")
        sand_factor = Decimal("1.75")
        agg_factor = Decimal("1.40")
        brick_factor = Decimal("19")

    cement_bags = quantize_qty(total_area * cement_factor, places=0)
    steel_kg = quantize_qty(total_area * steel_factor, places=0)
    steel_tonnes = quantize_qty(steel_kg / Decimal("1000.0"), places=2)
    sand_cuft = quantize_qty(total_area * sand_factor, places=1)
    sand_brass = quantize_qty(sand_cuft / BRASS_TO_CUFT, places=2)
    agg_cuft = quantize_qty(total_area * agg_factor, places=1)
    agg_brass = quantize_qty(agg_cuft / BRASS_TO_CUFT, places=2)
    bricks_count = quantize_qty(total_area * brick_factor, places=0)

    # Suggested BOQ initial lines for 1-click detailed estimate creation
    # Excavation (approx 0.15 cum per sqft)
    exc_qty = quantize_qty(total_area * Decimal("0.015"), places=2)
    # PCC concrete (approx 0.015 cum per sqft)
    pcc_qty = quantize_qty(total_area * Decimal("0.012"), places=2)
    # RCC frame concrete (approx 0.055 cum per sqft)
    rcc_qty = quantize_qty(total_area * Decimal("0.055"), places=2)
    # Brickwork (approx 0.04 cum per sqft)
    brick_vol = quantize_qty(total_area * Decimal("0.04"), places=2)
    # Plaster (approx 2.5 sqm per sqft)
    plaster_qty = quantize_qty(total_area * Decimal("0.23"), places=2)
    # Flooring (approx 0.85 sqm per sqft)
    flooring_qty = quantize_qty(total_area * Decimal("0.08"), places=2)

    return {
        "built_up_area_sqft": quantize_qty(total_area, places=2),
        "cost_per_sqft": cost_per_sqft,
        "cost_per_sqm": quantize_currency(cost_per_sqft * SQM_TO_SQFT),
        "total_estimated_cost": total_cost,
        "quality_tier": q,
        "floors": num_floors,
        "region_id": region_id,
        "materials": {
            "cement_bags": cement_bags,
            "steel_kg": steel_kg,
            "steel_tonnes": steel_tonnes,
            "sand_cuft": sand_cuft,
            "sand_brass": sand_brass,
            "aggregate_cuft": agg_cuft,
            "aggregate_brass": agg_brass,
            "bricks_count": bricks_count,
        },
        "boq_preview": [
            {"item_number": "1.1", "description": "Earthwork excavation in foundation soil", "category": "earthwork", "quantity": exc_qty, "unit": "cum"},
            {"item_number": "2.1", "description": "Plain Cement Concrete (PCC 1:4:8) in foundation", "category": "concrete", "quantity": pcc_qty, "unit": "cum"},
            {"item_number": "3.1", "description": "Reinforced Cement Concrete (RCC M20/M25) in frame", "category": "concrete", "quantity": rcc_qty, "unit": "cum"},
            {"item_number": "4.1", "description": "TMT Fe 500D Reinforcement Steel Rebar (supply & bend)", "category": "reinforcement", "quantity": steel_tonnes, "unit": "tonne"},
            {"item_number": "5.1", "description": "Brick Masonry in Cement Mortar 1:6", "category": "brickwork", "quantity": brick_vol, "unit": "cum"},
            {"item_number": "6.1", "description": "Internal and External Cement Plastering 1:4", "category": "plaster", "quantity": plaster_qty, "unit": "sqm"},
            {"item_number": "7.1", "description": "Vitrified Ceramic Floor Tiles 600x600mm", "category": "finishing", "quantity": flooring_qty, "unit": "sqm"},
        ],
        "disclaimer": "Preliminary budget estimate based on state PWD building cost index. Does not replace detailed architectural/structural BOQ.",
    }


def calculate_boundary_wall_quantities(
    length_m: Any,
    height_m: Any,
    thickness_mm: Any = 230,
    masonry_type: str = "clay_brick",
    gate_width_m: Any = 0,
    gate_height_m: Any = 0,
    foundation_depth_m: Any = Decimal("0.8"),
    coping_thickness_mm: Any = Decimal("75"),
    include_plaster: bool = True,
    include_paint: bool = True,
) -> Dict[str, Any]:
    """
    Calculates detailed civil quantities for boundary walls as per IS 1200.
    Includes excavation, foundation PCC, masonry, coping concrete, plaster, and paint.
    """
    L = to_decimal(length_m)
    H = to_decimal(height_m)
    T = to_decimal(thickness_mm) / Decimal("1000.0")  # m
    D = to_decimal(foundation_depth_m)
    GW = to_decimal(gate_width_m) if gate_width_m else Decimal("0.0")
    GH = to_decimal(gate_height_m) if gate_height_m else Decimal("0.0")

    if L <= 0 or H <= 0 or T <= 0:
        raise ValueError("Wall length, height, and thickness must be strictly positive.")

    # Deduct gate opening from net wall area
    gross_area = L * H
    gate_area = GW * GH
    net_area = max(Decimal("0.0"), gross_area - gate_area)

    # Masonry Volume
    masonry_vol = quantize_qty(net_area * T, places=4)

    # Bricks or AAC blocks count
    if "aac" in masonry_type.lower():
        # AAC blocks 600x200x(T)
        block_vol = Decimal("0.6") * Decimal("0.2") * T
        units_count = quantize_qty((masonry_vol / block_vol) * Decimal("1.03"), places=0)  # 3% wastage
        units_label = "AAC Blocks (Nos)"
    else:
        # Standard Red Bricks (500 per cum + 5% wastage)
        units_count = quantize_qty(masonry_vol * Decimal("525.0"), places=0)
        units_label = "Red Clay Bricks (Nos)"

    # Foundation Earthwork Excavation (Trench width = T + 0.3m)
    trench_w = T + Decimal("0.30")
    excavation_vol = quantize_qty(L * trench_w * D, places=4)

    # Foundation PCC 1:4:8 Concrete (Thickness = 0.15m)
    pcc_vol = quantize_qty(L * trench_w * Decimal("0.15"), places=4)

    # Coping Concrete on top of wall (Thickness = coping_thickness_mm)
    coping_t = to_decimal(coping_thickness_mm) / Decimal("1000.0")
    coping_vol = quantize_qty(L * T * coping_t, places=4)

    # Plastering (Both sides + top coping)
    plaster_area = Decimal("0.0")
    if include_plaster:
        plaster_area = quantize_qty((net_area * Decimal("2.0")) + (L * T), places=2)

    # Painting (Same as plaster area)
    paint_area = plaster_area if include_paint else Decimal("0.0")

    # Cement consumption for mortar & concrete
    # PCC: ~3.4 bags/cum; Masonry mortar 1:6: ~1.2 bags/cum; Plaster 1:4: ~0.15 bags/sqm
    cement_bags = quantize_qty(
        (pcc_vol * Decimal("3.4")) +
        (coping_vol * Decimal("7.0")) +
        (masonry_vol * Decimal("1.2")) +
        (plaster_area * Decimal("0.15")),
        places=0
    )

    sand_cum = quantize_qty(
        (pcc_vol * Decimal("0.45")) +
        (masonry_vol * Decimal("0.24")) +
        (plaster_area * Decimal("0.02")),
        places=2
    )

    return {
        "wall_length_m": L,
        "wall_height_m": H,
        "wall_thickness_mm": thickness_mm,
        "net_wall_area_sqm": quantize_qty(net_area, places=2),
        "masonry_volume_cum": masonry_vol,
        "units_count": units_count,
        "units_label": units_label,
        "excavation_volume_cum": excavation_vol,
        "foundation_pcc_cum": pcc_vol,
        "coping_concrete_cum": coping_vol,
        "plaster_area_sqm": plaster_area,
        "paint_area_sqm": paint_area,
        "cement_bags": cement_bags,
        "sand_cum": sand_cum,
        "boq_preview": [
            {"item_number": "1.1", "description": f"Earthwork excavation for boundary wall foundation ({float(D):.1f}m deep)", "category": "earthwork", "quantity": excavation_vol, "unit": "cum"},
            {"item_number": "2.1", "description": "PCC 1:4:8 bed concrete in foundation trench", "category": "concrete", "quantity": pcc_vol, "unit": "cum"},
            {"item_number": "3.1", "description": f"Boundary wall masonry {thickness_mm}mm in 1:6 cement mortar", "category": "brickwork", "quantity": masonry_vol, "unit": "cum"},
            {"item_number": "4.1", "description": "PCC 1:2:4 coping concrete on top of wall with drip mould", "category": "concrete", "quantity": coping_vol, "unit": "cum"},
            {"item_number": "5.1", "description": "15mm cement plaster 1:4 on both sides of boundary wall", "category": "plaster", "quantity": plaster_area, "unit": "sqm"},
            {"item_number": "6.1", "description": "Exterior weather-shield acrylic paint 2 coats over primer", "category": "painting", "quantity": paint_area, "unit": "sqm"},
        ],
        "disclaimer": "Structural safety requirements (RCC column spacing, footing size, reinforcement) require certified civil engineering design.",
    }
