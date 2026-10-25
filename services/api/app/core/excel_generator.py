"""
Excel BOQ Export Engine for Anumaan Quotations.
Generates styled, professional .xlsx workbooks with formula injection prevention,
multilingual localization (English, Marathi, Hindi), frozen panes, and reconciled financial totals.
"""

import io
from typing import Dict, Any, List
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


I18N_EXCEL_LABELS = {
    "en": {
        "sheet_title": "BOQ & Quotation",
        "title_banner": "अनुमान (Anumaan) — Construction Quotation & Bill of Quantities",
        "tagline": "Accurate construction estimation in minutes.",
        "quotation_no": "Quotation No:",
        "status": "Status:",
        "issue_date": "Issue Date:",
        "valid_until": "Valid Until:",
        "ref_estimate": "Ref. Estimate:",
        "contractor": "Contractor:",
        "gstin": "GSTIN:",
        "client": "Client:",
        "project": "Project:",
        "site_location": "Site Location:",
        "headers": [
            "Item #",
            "Item Description",
            "Category",
            "Specification / Calculation Formula",
            "Quantity",
            "Unit",
            "Unit Rate (₹)",
            "Amount (₹)",
        ],
        "subtotal": "BOQ Subtotal:",
        "overhead": "Overhead Cost:",
        "contingency": "Contingency Reserve:",
        "discount": "Discount Deducted:",
        "taxable": "Pre-Tax Taxable Amount:",
        "tax_applicable": "Applicable {tax_name} ({rate:.1f}%):",
        "tax_unconfigured": "Tax not configured (Explicit confirmation required):",
        "grand_total": "Grand Total (INR ₹):",
        "terms_header": "Contract Terms, Exclusions & Notes",
        "payment_terms": "Payment Terms:",
        "exclusions": "Scope Exclusions:",
        "notes": "Notes & Assumptions:",
    },
    "mr": {
        "sheet_title": "बीओक्यू आणि दरपत्रक",
        "title_banner": "अनुमान (Anumaan) — बांधकाम दरपत्रक आणि परिमाण पत्रक (BOQ)",
        "tagline": "मिनिटांत अचूक बांधकाम अंदाजपत्रक.",
        "quotation_no": "दरपत्रक क्र.:",
        "status": "स्थिती:",
        "issue_date": "जारी दिनांक:",
        "valid_until": "वैधता दिनांक:",
        "ref_estimate": "संदर्भ अंदाज क्र.:",
        "contractor": "कंत्राटदार:",
        "gstin": "जीएसटी क्र.:",
        "client": "ग्राहक:",
        "project": "प्रकल्प:",
        "site_location": "जागा/ठिकाण:",
        "headers": [
            "अ.क्र.",
            "कामाचा तपशील",
            "श्रेणी",
            "तपशील / गणना सूत्र",
            "प्रमाण",
            "एकक",
            "दर (₹)",
            "रक्कम (₹)",
        ],
        "subtotal": "बीओक्यू उपएकूण:",
        "overhead": "ओव्हरहेड खर्च:",
        "contingency": "आकस्मिक खर्च:",
        "discount": "सवलत:",
        "taxable": "करपात्र रक्कम:",
        "tax_applicable": "लागू {tax_name} ({rate:.1f}%):",
        "tax_unconfigured": "कर कॉन्फिगर केलेला नाही (पुष्टी आवश्यक):",
        "grand_total": "अंतिम एकूण रक्कम (रु.):",
        "terms_header": "कराराच्या अटी, वगळण्यात आलेल्या बाबी व नोंदी",
        "payment_terms": "देयकाच्या अटी:",
        "exclusions": "वगळण्यात आलेल्या बाबी:",
        "notes": "नोंदी आणि गृहितके:",
    },
    "hi": {
        "sheet_title": "बीओक्यू और दरपत्रक",
        "title_banner": "अनुमान (Anumaan) — निर्माण दरपत्रक और मात्रा बिल (BOQ)",
        "tagline": "मिनटों में पूरा अनुमान।",
        "quotation_no": "कोटेशन सं.:",
        "status": "स्थिति:",
        "issue_date": "जारी दिनांक:",
        "valid_until": "वैधता दिनांक:",
        "ref_estimate": "संदर्भ प्राक्कलन सं.:",
        "contractor": "ठेकेदार:",
        "gstin": "जीएसटी सं.:",
        "client": "ग्राहक:",
        "project": "परियोजना:",
        "site_location": "स्थान:",
        "headers": [
            "क्र.सं.",
            "कार्य का विवरण",
            "श्रेणी",
            "विनिर्देश / गणना सूत्र",
            "मात्रा",
            "इकाई",
            "दर (₹)",
            "राशि (₹)",
        ],
        "subtotal": "बीओक्यू उप-योग:",
        "overhead": "ओवरहेड व्यय:",
        "contingency": "आकस्मिक व्यय:",
        "discount": "छूट:",
        "taxable": "कर योग्य राशि:",
        "tax_applicable": "लागू {tax_name} ({rate:.1f}%):",
        "tax_unconfigured": "कर कॉन्फ़िगर नहीं किया गया (पुष्टि आवश्यक):",
        "grand_total": "कुल योग (रु.):",
        "terms_header": "अनुबंध की शर्तें, बहिष्करण और टिप्पणियां",
        "payment_terms": "भुगतान की शर्तें:",
        "exclusions": "अपवर्जन (शामिल नहीं):",
        "notes": "टिप्पणियाँ एवं धारणाएँ:",
    },
}

I18N_STATUS = {
    "en": {"draft": "DRAFT", "issued": "ISSUED", "accepted": "ACCEPTED", "rejected": "REJECTED", "expired": "EXPIRED"},
    "mr": {"draft": "मसुदा (DRAFT)", "issued": "जारी केले (ISSUED)", "accepted": "स्वीकृत (ACCEPTED)", "rejected": "नाकारले (REJECTED)", "expired": "कालबाह्य (EXPIRED)"},
    "hi": {"draft": "प्रारूप (DRAFT)", "issued": "जारी किया (ISSUED)", "accepted": "स्वीकृत (ACCEPTED)", "rejected": "अस्वीकृत (REJECTED)", "expired": "समाप्त (EXPIRED)"},
}


# Prevent CSV / Formula Injection in Excel
def sanitize_cell_value(val: Any) -> Any:
    if isinstance(val, str):
        # If user-provided string begins with formula trigger chars, escape with leading apostrophe
        if val.startswith(("=", "+", "-", "@")):
            return "'" + val
    return val


def generate_quotation_excel(quotation_data: Dict[str, Any]) -> bytes:
    """
    Generates a professional Excel workbook for a quotation.
    Reads from snapshot if issued. Respects the quotation language preference (en, mr, hi).
    """
    lang = str(quotation_data.get("language") or "en").lower()
    if lang not in I18N_EXCEL_LABELS:
        lang = "en"
    labels = I18N_EXCEL_LABELS[lang]
    status_map = I18N_STATUS.get(lang, I18N_STATUS["en"])

    wb = Workbook()
    ws = wb.active
    ws.title = "BOQ & Quotation"

    # Ensure grid lines are visible
    ws.views.sheetView[0].showGridLines = True

    # Palette
    CHARCOAL = "1F2937"
    GOLD = "B8860B"
    LIGHT_BG = "FBF8F3"
    ACCENT_ROW = "F9FAFB"
    WHITE = "FFFFFF"
    GRAY_TEXT = "4B5563"
    BORDER_COLOR = "D1D5DB"

    thin_border = Border(
        left=Side(style="thin", color=BORDER_COLOR),
        right=Side(style="thin", color=BORDER_COLOR),
        top=Side(style="thin", color=BORDER_COLOR),
        bottom=Side(style="thin", color=BORDER_COLOR),
    )

    header_font = Font(name="Segoe UI", size=11, bold=True, color=WHITE)
    header_fill = PatternFill(start_color=CHARCOAL, end_color=CHARCOAL, fill_type="solid")

    bold_font = Font(name="Segoe UI", size=10, bold=True, color=CHARCOAL)
    regular_font = Font(name="Segoe UI", size=10, color=CHARCOAL)
    gray_font = Font(name="Segoe UI", size=9, color=GRAY_TEXT)

    # 1. Title Banner
    ws.merge_cells("A1:H1")
    title_cell = ws["A1"]
    title_cell.value = labels["title_banner"]
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color=WHITE)
    title_cell.fill = header_fill
    title_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 32

    # Tagline
    ws.merge_cells("A2:H2")
    sub_cell = ws["A2"]
    sub_cell.value = labels["tagline"]
    sub_cell.font = Font(name="Segoe UI", size=9, italic=True, color=GRAY_TEXT)
    sub_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18

    # 2. Quotation & Organization Metadata Block
    q_num = quotation_data.get("quotation_number") or "QT-DRAFT"
    raw_status = str(quotation_data.get("status") or "draft").lower()
    status_str = status_map.get(raw_status, raw_status.upper())
    issue_date = str(quotation_data.get("issue_date") or "-")
    valid_until = str(quotation_data.get("valid_until_date") or "-")

    comp = quotation_data.get("company") or {}
    client = quotation_data.get("client") or {}
    project = quotation_data.get("project") or {}

    # Metadata rows
    metadata = [
        (labels["quotation_no"], q_num, labels["contractor"], comp.get("name") or "Contractor Company"),
        (labels["status"], status_str, labels["gstin"], comp.get("gstin") or "Unspecified"),
        (labels["issue_date"], issue_date, labels["client"], client.get("name") or "Client"),
        (labels["valid_until"], valid_until, labels["project"], project.get("name") or "Project Site"),
        (labels["ref_estimate"], project.get("reference_estimate_number") or quotation_data.get("estimate_number") or "-", labels["site_location"], project.get("site_location") or "-"),
    ]

    curr_row = 4
    for m in metadata:
        ws.cell(row=curr_row, column=1, value=m[0]).font = bold_font
        ws.cell(row=curr_row, column=2, value=sanitize_cell_value(m[1])).font = regular_font
        ws.cell(row=curr_row, column=4, value=m[2]).font = bold_font
        ws.cell(row=curr_row, column=5, value=sanitize_cell_value(m[3])).font = regular_font
        curr_row += 1

    curr_row += 1

    # 3. BOQ Table Header
    headers = labels["headers"]

    header_row_idx = curr_row
    ws.row_dimensions[header_row_idx].height = 24

    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=header_row_idx, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center" if col_idx in (1, 6) else ("right" if col_idx in (5, 7, 8) else "left"), vertical="center")
        cell.border = thin_border

    # Freeze pane directly below headers
    ws.freeze_panes = f"A{header_row_idx + 1}"

    # 4. BOQ Items
    items = quotation_data.get("items") or []
    item_start_row = header_row_idx + 1
    curr_row = item_start_row

    for idx, it in enumerate(items):
        ws.row_dimensions[curr_row].height = 20
        is_even = (idx % 2 == 1)
        row_fill = PatternFill(start_color=ACCENT_ROW, end_color=ACCENT_ROW, fill_type="solid") if is_even else None

        sr = str(it.get("item_number") or (idx + 1))
        desc = str(it.get("description") or "")
        cat = str(it.get("category") or "general").title()
        spec = str(it.get("specification") or it.get("calculation_details", {}).get("formula") or "-")
        qty = float(it.get("quantity") or 0)
        unit = str(it.get("unit") or "nos")
        rate = float(it.get("unit_rate") or 0)
        amount = float(it.get("amount") or (qty * rate))

        cells = [
            (1, sanitize_cell_value(sr), "center", None),
            (2, sanitize_cell_value(desc), "left", None),
            (3, sanitize_cell_value(cat), "left", None),
            (4, sanitize_cell_value(spec), "left", None),
            (5, qty, "right", "#,##0.0000"),
            (6, sanitize_cell_value(unit), "center", None),
            (7, rate, "right", "#,##0.00"),
            (8, amount, "right", "#,##0.00"),
        ]

        for col_idx, val, align, num_fmt in cells:
            c = ws.cell(row=curr_row, column=col_idx, value=val)
            c.font = regular_font
            c.border = thin_border
            c.alignment = Alignment(horizontal=align, vertical="center")
            if row_fill:
                c.fill = row_fill
            if num_fmt:
                c.number_format = num_fmt

        curr_row += 1

    # 5. Financial Summary Block
    fin = quotation_data.get("financials") or quotation_data
    subtotal = float(fin.get("subtotal") or 0)
    oh_amt = float(fin.get("overhead_amount") or 0)
    cont_amt = float(fin.get("contingency_amount") or 0)
    disc_amt = float(fin.get("discount_amount") or 0)
    taxable_amt = float(fin.get("taxable_amount") or (subtotal + oh_amt + cont_amt - disc_amt))
    tax_configured = bool(fin.get("tax_configured", False))
    tax_rate = float(fin.get("tax_rate") or 0)
    tax_name = str(fin.get("tax_name") or "GST")
    tax_amt = float(fin.get("tax_amount") or (taxable_amt * tax_rate / 100 if tax_configured else 0))
    grand_total = float(fin.get("total_amount") or (taxable_amt + tax_amt))

    curr_row += 1

    tax_label = (
        labels["tax_applicable"].format(tax_name=tax_name, rate=tax_rate)
        if tax_configured
        else labels["tax_unconfigured"]
    )

    summary_items = [
        (labels["subtotal"], subtotal, False),
        (labels["overhead"], oh_amt, False) if oh_amt > 0 else None,
        (labels["contingency"], cont_amt, False) if cont_amt > 0 else None,
        (labels["discount"], -disc_amt, False) if disc_amt > 0 else None,
        (labels["taxable"], taxable_amt, True),
        (tax_label, tax_amt, False),
        (labels["grand_total"], grand_total, True),
    ]

    for item in summary_items:
        if not item:
            continue
        label, val, is_bold = item
        ws.row_dimensions[curr_row].height = 20

        # Label across E, F & G
        ws.merge_cells(start_row=curr_row, start_column=5, end_row=curr_row, end_column=7)
        lbl_cell = ws.cell(row=curr_row, column=5, value=label)
        lbl_cell.font = Font(name="Segoe UI", size=10, bold=is_bold, color=CHARCOAL)
        lbl_cell.alignment = Alignment(horizontal="right", vertical="center")

        val_cell = ws.cell(row=curr_row, column=8, value=val)
        val_cell.font = Font(name="Segoe UI", size=10, bold=is_bold, color=CHARCOAL if not is_bold else GOLD)
        val_cell.alignment = Alignment(horizontal="right", vertical="center")
        val_cell.number_format = "#,##0.00"
        val_cell.border = thin_border

        if is_bold and label == labels["grand_total"]:
            val_cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")  # Gold light tint
            lbl_cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

        curr_row += 1

    # 6. Terms & Conditions Section
    curr_row += 2
    ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=8)
    t_header = ws.cell(row=curr_row, column=1, value=labels["terms_header"])
    t_header.font = Font(name="Segoe UI", size=11, bold=True, color=CHARCOAL)
    t_header.fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
    curr_row += 1

    terms_list = [
        (labels["payment_terms"], quotation_data.get("payment_terms") or "-"),
        (labels["exclusions"], quotation_data.get("exclusions") or "-"),
        (labels["notes"], quotation_data.get("notes") or "-"),
    ]

    for t_name, t_val in terms_list:
        ws.cell(row=curr_row, column=1, value=t_name).font = bold_font
        ws.merge_cells(start_row=curr_row, start_column=2, end_row=curr_row, end_column=8)
        ws.cell(row=curr_row, column=2, value=sanitize_cell_value(t_val)).font = regular_font
        curr_row += 1

    # 7. Auto-fit column widths
    col_width_defaults = {1: 10, 2: 38, 3: 16, 4: 36, 5: 14, 6: 10, 7: 15, 8: 18}
    for col_idx, width in col_width_defaults.items():
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width

    # Save to memory buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
