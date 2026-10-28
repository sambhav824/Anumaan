from typing import Any, Dict, List, Optional
import os
from decimal import Decimal
from datetime import date
from fpdf import FPDF
from fpdf.enums import XPos, YPos


FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fonts")
NOTO_REGULAR = os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf")
NOTO_BOLD = os.path.join(FONTS_DIR, "NotoSansDevanagari-Bold.ttf")


# Localized labels for English, Marathi, Hindi
I18N_LABELS = {
    "en": {
        "title": "QUOTATION",
        "tagline": "Civil Estimation in Minutes.",
        "brand": "अनुमान (Anumaan)",
        "quotation_no": "Quotation No:",
        "issue_date": "Issue Date:",
        "valid_until": "Valid Until:",
        "status": "Status:",
        "ref_estimate": "Ref. Estimate:",
        "client_details": "CLIENT DETAILS",
        "project_details": "PROJECT DETAILS",
        "company_details": "CONTRACTOR DETAILS",
        "client_name": "Client:",
        "contact_person": "Contact:",
        "address": "Address:",
        "phone": "Phone:",
        "email": "Email:",
        "gstin": "GSTIN:",
        "project_name": "Project:",
        "location": "Location:",
        "project_type": "Type:",
        "sr_no": "Sr.",
        "description": "Item Description",
        "spec": "Specification / Formula",
        "qty": "Quantity",
        "unit": "Unit",
        "rate": "Rate (INR)",
        "amount": "Amount (INR)",
        "subtotal": "BOQ Subtotal:",
        "overhead": "Overhead:",
        "contingency": "Contingency:",
        "discount": "Discount:",
        "taxable": "Pre-Tax Taxable Amount:",
        "tax_not_configured": "Tax not configured",
        "tax": "Tax",
        "grand_total": "Grand Total:",
        "payment_terms": "Payment Terms:",
        "exclusions": "Scope Exclusions:",
        "notes": "Notes & Conditions:",
        "signatory": "Authorized Signatory",
        "stamp_area": "Company Stamp",
        "page": "Page",
        "of": "of",
    },
    "mr": {
        "title": "दरपत्रक (QUOTATION)",
        "tagline": "मिनिटांत पूर्ण अंदाज.",
        "brand": "अनुमान (Anumaan)",
        "quotation_no": "दरपत्रक क्र.:",
        "issue_date": "जारी दिनांक:",
        "valid_until": "वैधता दिनांक:",
        "status": "स्थिती:",
        "ref_estimate": "संदर्भ अंदाज क्र.:",
        "client_details": "ग्राहकाचा तपशील",
        "project_details": "प्रकल्पाचा तपशील",
        "company_details": "कंत्राटदाराचा तपशील",
        "client_name": "ग्राहक:",
        "contact_person": "संपर्क व्यक्ती:",
        "address": "पत्ता:",
        "phone": "फोन:",
        "email": "ईमेल:",
        "gstin": "जीएसटी क्र.:",
        "project_name": "प्रकल्प:",
        "location": "जागा/ठिकाण:",
        "project_type": "प्रकार:",
        "sr_no": "अ.क्र.",
        "description": "कामाचा तपशील",
        "spec": "तपशील / सूत्र",
        "qty": "प्रमाण",
        "unit": "एकक",
        "rate": "दर (रु.)",
        "amount": "रक्कम (रु.)",
        "subtotal": "एकूण रक्कम (Subtotal):",
        "overhead": "ओव्हरहेड खर्च:",
        "contingency": "आकस्मिक खर्च:",
        "discount": "सूट (Discount):",
        "taxable": "करपात्र रक्कम (Taxable):",
        "tax_not_configured": "कर निश्चित केलेला नाही (Tax not configured)",
        "tax": "कर (GST)",
        "grand_total": "अंतिम एकूण रक्कम (Grand Total):",
        "payment_terms": "देयक अटी (Payment Terms):",
        "exclusions": "वगळलेली कामे (Exclusions):",
        "notes": "टीप व अटी (Notes):",
        "signatory": "अधिकृत स्वाक्षरीकर्ता",
        "stamp_area": "कंपनीचा शिक्का",
        "page": "पृष्ठ",
        "of": "पैकी",
    },
    "hi": {
        "title": "दर प्रस्ताव (QUOTATION)",
        "tagline": "मिनटों में पूरा अनुमान।",
        "brand": "अनुमान (Anumaan)",
        "quotation_no": "कोटेशन संख्या:",
        "issue_date": "जारी तिथि:",
        "valid_until": "वैधता तिथि:",
        "status": "स्थिति:",
        "ref_estimate": "संदर्भ प्राक्कलन संख्या:",
        "client_details": "ग्राहक विवरण",
        "project_details": "परियोजना विवरण",
        "company_details": "ठेकेदार विवरण",
        "client_name": "ग्राहक:",
        "contact_person": "संपर्क व्यक्ति:",
        "address": "पता:",
        "phone": "फोन:",
        "email": "ईमेल:",
        "gstin": "जीएसटीआईएन:",
        "project_name": "परियोजना:",
        "location": "स्थान:",
        "project_type": "प्रकार:",
        "sr_no": "क्र.सं.",
        "description": "मद विवरण",
        "spec": "विशिष्टता / सूत्र",
        "qty": "मात्रा",
        "unit": "इकाई",
        "rate": "दर (रु.)",
        "amount": "राशि (रु.)",
        "subtotal": "उप-कुल (Subtotal):",
        "overhead": "उपरिव्यय (Overhead):",
        "contingency": "आकस्मिक व्यय:",
        "discount": "छूट (Discount):",
        "taxable": "कर योग्य राशि (Taxable):",
        "tax_not_configured": "कर निर्धारित नहीं (Tax not configured)",
        "tax": "कर (GST)",
        "grand_total": "अंतिम कुल योग (Grand Total):",
        "payment_terms": "भुगतान की शर्तें:",
        "exclusions": "अपवर्जित कार्य (Exclusions):",
        "notes": "नोट्स एवं नियम:",
        "signatory": "अधिकृत हस्ताक्षरकर्ता",
        "stamp_area": "कंपनी की मुहर",
        "page": "पृष्ठ",
        "of": "का",
    },
}


class AnumaanQuotationPDF(FPDF):
    def __init__(self, language: str = "en", quotation_ref: str = ""):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.language = language if language in I18N_LABELS else "en"
        self.lbl = I18N_LABELS[self.language]
        self.quotation_ref = quotation_ref
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(15, 15, 15)

        # Setup bundled Devanagari fonts
        if os.path.exists(NOTO_REGULAR) and os.path.exists(NOTO_BOLD):
            self.add_font("NotoDev", "", NOTO_REGULAR)
            self.add_font("NotoDev", "B", NOTO_BOLD)
            self.font_family_name = "NotoDev"
        elif os.path.exists(r"C:\Windows\Fonts\Nirmala.ttc"):
            self.add_font("Nirmala", "", r"C:\Windows\Fonts\Nirmala.ttc")
            self.font_family_name = "Nirmala"
        else:
            self.font_family_name = "Helvetica"

        # Enable HarfBuzz text shaping for correct conjuncts & matras
        self.set_text_shaping(True)

    def header(self):
        # Only render running header on page 2 onwards
        if self.page_no() > 1:
            self.set_font(self.font_family_name, "B", 8)
            self.set_text_color(120, 120, 120)
            self.cell(100, 6, f"{self.lbl['brand']} — {self.lbl['title']}", align="L")
            self.cell(80, 6, f"{self.quotation_ref}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_draw_color(220, 220, 220)
            self.line(15, self.get_y(), 195, self.get_y())
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font(self.font_family_name, "", 8)
        self.set_text_color(140, 140, 140)
        page_str = f"{self.lbl['page']} {self.page_no()} {self.lbl['of']} {{nb}}"
        self.cell(100, 6, f"{self.quotation_ref} • {self.lbl['brand']}", align="L")
        self.cell(80, 6, page_str, align="R")


def format_currency_inr(val: Any) -> str:
    try:
        n = float(val)
        return f"{n:,.2f}"
    except (ValueError, TypeError):
        return "0.00"


def generate_quotation_pdf(quotation_data: dict) -> bytes:
    """
    Generates an authoritative, print-ready PDF for an issued quotation or preview.
    Features:
    - Contractor/Company logo or crisp brand mark.
    - Full unclipped contractor, client, and project details with dynamic wrapping.
    - Repeating table headers across multi-page BOQ tables.
    - Transparent financial adjustments breakdown (Base, Overhead, Contingency, Discount, Taxable, GST, Grand Total).
    - Scope exclusions, payment terms, validity, and authorized signatory & stamp blocks.
    - Minimalist, professional white, beige, and charcoal styling suitable for A4 printing.
    """
    lang = quotation_data.get("language") or "en"
    q_num = quotation_data.get("quotation_number") or "QT-DRAFT"

    pdf = AnumaanQuotationPDF(language=lang, quotation_ref=q_num)
    lbl = pdf.lbl
    font_name = pdf.font_family_name
    pdf.add_page()

    # Brand Colors (ANUMAAN Official Palette)
    NAVY = (16, 47, 87)          # #102F57
    ORANGE = (247, 147, 30)      # #F7931E
    TEXT_DARK = (38, 52, 69)     # #263445
    TEXT_MUTED = (100, 116, 139) # #64748B
    LIGHT_BG = (243, 246, 250)   # #F3F6FA
    BORDER_CLR = (220, 228, 238) # #DCE4EE
    TABLE_HEADER = (232, 238, 245) # #E8EEF5

    # 1. TOP BRAND & CONTRACTOR HEADER BANNER
    pdf.set_fill_color(*LIGHT_BG)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(15, 15, 180, 26, style="FD")

    comp = quotation_data.get("company") or {}
    client = quotation_data.get("client") or {}
    project = quotation_data.get("project") or {}

    # Check for custom logo path/file
    logo_path = comp.get("logo_path") or comp.get("logo_url") or quotation_data.get("logo_path")
    has_logo = False
    if logo_path and isinstance(logo_path, str) and os.path.exists(logo_path):
        try:
            pdf.image(logo_path, x=18, y=18, h=20)
            has_logo = True
        except Exception:
            has_logo = False

    text_start_x = 42 if has_logo else 18
    text_width = 86 if has_logo else 110

    pdf.set_xy(text_start_x, 18)
    pdf.set_font(font_name, "B", 16)
    pdf.set_text_color(*NAVY)
    # Company Name or Brand
    header_title = comp.get("name") or lbl["brand"]
    pdf.cell(text_width, 8, header_title, align="L")

    pdf.set_font(font_name, "B", 14)
    pdf.set_text_color(*NAVY)
    pdf.cell(64, 8, lbl["title"], align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_xy(text_start_x, 27)
    pdf.set_font(font_name, "", 8.5)
    pdf.set_text_color(*TEXT_MUTED)
    tagline_text = f"{lbl['brand']} • {lbl['tagline']}" if comp.get("name") else lbl["tagline"]
    pdf.cell(text_width, 5, tagline_text, align="L")

    status_str = str(quotation_data.get("status") or "DRAFT").upper()
    pdf.set_font(font_name, "B", 8.5)
    pdf.set_text_color(*ORANGE)
    pdf.cell(64, 5, f"{lbl['status']} {status_str}", align="R")

    pdf.set_y(44)

    # 2. METADATA & DATES BAR
    pdf.set_font(font_name, "B", 8.5)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(45, 6, f"{lbl['quotation_no']} {q_num}")
    
    issue_dt = str(quotation_data.get("issue_date") or quotation_data.get("created_at") or date.today().isoformat())
    pdf.cell(45, 6, f"{lbl['issue_date']} {issue_dt}")
    
    valid_dt = str(quotation_data.get("valid_until_date") or quotation_data.get("valid_until") or "-")
    pdf.cell(45, 6, f"{lbl['valid_until']} {valid_dt}")

    ref_est = project.get("reference_estimate_number") or quotation_data.get("estimate_number") or "-"
    pdf.cell(45, 6, f"{lbl['ref_estimate']} {ref_est}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_draw_color(*BORDER_CLR)
    pdf.line(15, pdf.get_y() + 2, 195, pdf.get_y() + 2)
    pdf.ln(4)

    # 3. COMPANY, CLIENT & PROJECT 2-COLUMN SECTION (Dynamic Height)
    col_y = pdf.get_y()
    box_height = 40
    
    # Left Box: Contractor / Company Details
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(15, col_y, 88, box_height, style="FD")

    pdf.set_xy(18, col_y + 2)
    pdf.set_font(font_name, "B", 8.5)
    pdf.set_text_color(*NAVY)
    pdf.cell(82, 4.5, lbl["company_details"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(18)
    pdf.set_font(font_name, "B", 9.5)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(82, 4.5, comp.get("name") or "Contractor Company", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(18)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    c_addr = comp.get("business_address") or ""
    if comp.get("city"): c_addr += f", {comp.get('city')}"
    if comp.get("state"): c_addr += f", {comp.get('state')}"
    if comp.get("pin_code"): c_addr += f" - {comp.get('pin_code')}"
    pdf.multi_cell(82, 3.5, c_addr if c_addr else "Address on record")

    pdf.set_x(18)
    c_contact = []
    if comp.get("phone"): c_contact.append(f"{lbl['phone']} {comp.get('phone')}")
    if comp.get("email"): c_contact.append(f"{comp.get('email')}")
    if c_contact:
        pdf.cell(82, 3.5, " | ".join(c_contact), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    if comp.get("gstin"):
        pdf.set_x(18)
        pdf.set_font(font_name, "B", 7.5)
        pdf.set_text_color(*TEXT_DARK)
        pdf.cell(82, 3.5, f"{lbl['gstin']} {comp.get('gstin')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Right Box: Client & Project Details
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(107, col_y, 88, box_height, style="FD")

    pdf.set_xy(110, col_y + 2)
    pdf.set_font(font_name, "B", 8.5)
    pdf.set_text_color(*NAVY)
    pdf.cell(82, 4.5, f"{lbl['client_details']} & {lbl['project_details']}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(110)
    pdf.set_font(font_name, "B", 9.5)
    pdf.set_text_color(*TEXT_DARK)
    client_name = client.get("name") or "Client"
    if client.get("contact_person"):
        client_name += f" ({client.get('contact_person')})"
    pdf.cell(82, 4.5, client_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(110)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    p_info = f"{lbl['project_name']} {project.get('name') or '-'}"
    if project.get("site_location"):
        p_info += f" ({project.get('site_location')})"
    pdf.cell(82, 3.5, p_info, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(110)
    cl_addr = client.get("billing_address") or ""
    if cl_addr:
        pdf.multi_cell(82, 3.5, f"{lbl['address']} {cl_addr}")

    if client.get("gstin"):
        pdf.set_x(110)
        pdf.set_font(font_name, "B", 7.5)
        pdf.set_text_color(*TEXT_DARK)
        pdf.cell(82, 3.5, f"{lbl['gstin']} {client.get('gstin')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_y(col_y + box_height + 4)

    # 4. ITEMIZED BOQ TABLE (With repeating headers across pages)
    items = quotation_data.get("items") or []
    
    table_headers = [
        lbl["sr_no"],
        lbl["description"],
        lbl["spec"],
        lbl["qty"],
        lbl["unit"],
        lbl["rate"],
        lbl["amount"],
    ]
    # Widths total 180mm (A4 width 210 - 30 margins)
    col_widths = (12, 60, 36, 18, 16, 18, 20)

    pdf.set_font(font_name, "B", 8)
    with pdf.table(
        col_widths=col_widths,
        text_align=("CENTER", "LEFT", "LEFT", "RIGHT", "CENTER", "RIGHT", "RIGHT"),
        line_height=5,
        borders_layout="ALL",
        padding=1.5,
        first_row_as_headings=True
    ) as table:
        header_row = table.row()
        pdf.set_fill_color(*TABLE_HEADER)
        pdf.set_text_color(*NAVY)
        for h in table_headers:
            header_row.cell(h)

        pdf.set_text_color(*TEXT_DARK)
        pdf.set_font(font_name, "", 8)
        for idx, it in enumerate(items):
            row = table.row()
            if idx % 2 == 1:
                pdf.set_fill_color(248, 250, 252)
            else:
                pdf.set_fill_color(255, 255, 255)

            sr = str(it.get("item_number") or (idx + 1))
            desc = str(it.get("description") or "")
            spec = str(it.get("specification") or it.get("calculation_details", {}).get("formula") or "-")
            qty_val = float(it.get("quantity") or 0)
            rate_val = float(it.get("unit_rate") or 0)
            amt_val = float(it.get("amount") or (qty_val * rate_val))
            unit_str = str(it.get("unit") or "nos")

            row.cell(sr)
            row.cell(desc)
            row.cell(spec)
            row.cell(f"{qty_val:.2f}")
            row.cell(unit_str)
            row.cell(f"{rate_val:.2f}")
            row.cell(f"{amt_val:.2f}")

    pdf.ln(3)

    # 5. FINANCIAL TOTALS BLOCK
    fin = quotation_data.get("financials") or quotation_data

    subtotal = float(fin.get("subtotal") or 0)
    oh_amt = float(fin.get("overhead_amount") or 0)
    cont_amt = float(fin.get("contingency_amount") or 0)
    taxable_amt = float(fin.get("taxable_amount") or (subtotal + oh_amt + cont_amt))
    tax_configured = bool(fin.get("tax_configured", False))
    tax_rate = float(fin.get("tax_rate") or 0)
    tax_amt = float(fin.get("tax_amount") or (taxable_amt * tax_rate / 100 if tax_configured else 0))
    grand_total = float(fin.get("total_amount") or (taxable_amt + tax_amt))

    # Keep summary block together
    if pdf.get_y() > 215:
        pdf.add_page()

    summary_y = pdf.get_y()
    
    # Left box: Terms & Conditions (width 102mm)
    pdf.set_fill_color(*LIGHT_BG)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(15, summary_y, 102, 54, style="FD")

    pdf.set_xy(18, summary_y + 2)
    pdf.set_font(font_name, "B", 8)
    pdf.set_text_color(*NAVY)
    pdf.cell(96, 4, lbl["payment_terms"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(18)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    p_terms = quotation_data.get("payment_terms") or "As per agreed milestone schedule."
    pdf.multi_cell(96, 3.5, p_terms)

    pdf.set_x(18)
    pdf.set_font(font_name, "B", 8)
    pdf.set_text_color(*NAVY)
    pdf.cell(96, 4, lbl["exclusions"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(18)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    excl = quotation_data.get("exclusions") or "Water and electricity at site to be provided by client."
    pdf.multi_cell(96, 3.5, excl)

    pdf.set_x(18)
    pdf.set_font(font_name, "B", 8)
    pdf.set_text_color(*NAVY)
    pdf.cell(96, 4, lbl["notes"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(18)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    notes = quotation_data.get("notes") or "Validity 30 days from date of issue."
    pdf.multi_cell(96, 3.5, notes)

    # Right box: Financial Totals Summary (width 74mm)
    pdf.set_xy(121, summary_y)
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(121, summary_y, 74, 54, style="FD")

    def summary_line(label: str, val: float, bold: bool = False, color: tuple = TEXT_DARK):
        pdf.set_font(font_name, "B" if bold else "", 8)
        pdf.set_text_color(*color)
        pdf.cell(46, 5.5, label, align="L")
        pdf.cell(24, 5.5, f"₹ {format_currency_inr(val)}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_x(123)

    pdf.set_xy(123, summary_y + 1)
    summary_line(lbl["subtotal"], subtotal)
    
    if oh_amt > 0:
        summary_line(f"{lbl['overhead']}", oh_amt)
    if cont_amt > 0:
        summary_line(f"{lbl['contingency']}", cont_amt)

    summary_line(lbl["taxable"], taxable_amt, bold=True)

    # Transparent Tax Representation
    if not tax_configured:
        pdf.set_font(font_name, "", 7.5)
        pdf.set_text_color(184, 107, 8) # Warning Amber #B86B08
        pdf.cell(46, 5.5, lbl["tax_not_configured"], align="L")
        pdf.cell(24, 5.5, "₹ 0.00", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_x(123)
    else:
        tax_label = f"{lbl['tax']} ({tax_rate:.1f}%):"
        summary_line(tax_label, tax_amt)

    # Grand Total Banner
    pdf.set_draw_color(*BORDER_CLR)
    pdf.line(121, pdf.get_y() + 1, 195, pdf.get_y() + 1)
    pdf.set_y(pdf.get_y() + 2)
    pdf.set_fill_color(*NAVY)
    pdf.rect(121, pdf.get_y(), 74, 8, style="F")

    pdf.set_xy(123, pdf.get_y() + 1)
    pdf.set_font(font_name, "B", 9)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(40, 6, lbl["grand_total"], align="L")
    pdf.set_text_color(*ORANGE) # Construction Orange
    pdf.cell(30, 6, f"₹ {format_currency_inr(grand_total)}", align="R")

    # 6. SIGNATURE & STAMP BLOCK
    pdf.set_y(summary_y + 58)
    
    # Left: Stamp Area
    pdf.set_draw_color(*BORDER_CLR)
    pdf.rect(20, pdf.get_y(), 45, 18, style="D")
    pdf.set_xy(20, pdf.get_y() + 7)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(45, 4, lbl["stamp_area"], align="CENTER")

    # Right: Signature Area
    sig_name = quotation_data.get("authorized_signatory_name") or comp.get("owner_person") or "Authorized Signatory"
    sig_desig = quotation_data.get("authorized_signatory_designation") or "Managing Director / Partner"

    pdf.set_xy(135, summary_y + 58 + 10)
    pdf.set_draw_color(*NAVY)
    pdf.line(130, pdf.get_y(), 190, pdf.get_y())
    pdf.set_y(pdf.get_y() + 2)
    pdf.set_x(130)
    pdf.set_font(font_name, "B", 8)
    pdf.set_text_color(*NAVY)
    pdf.cell(60, 4, sig_name, align="CENTER", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_x(130)
    pdf.set_font(font_name, "", 7.5)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(60, 4, sig_desig, align="CENTER")

    return bytes(pdf.output())
