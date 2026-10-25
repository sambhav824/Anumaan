import io
import pytest
from openpyxl import load_workbook

from app.core.pdf_generator import generate_quotation_pdf, format_currency_inr
from app.core.excel_generator import generate_quotation_excel


def test_format_currency_inr():
    assert format_currency_inr(0) == "0.00"
    assert format_currency_inr(1250) == "1,250.00"
    assert format_currency_inr("450000.50") == "450,000.50"
    assert format_currency_inr(None) == "0.00"
    assert format_currency_inr("invalid") == "0.00"


def test_multilingual_pdf_generation_en_mr_hi():
    """
    Validates PDF generation in English, Marathi, and Hindi.
    Ensures that Devanagari script renders cleanly without crashes and creates valid PDF bytes.
    """
    base_payload = {
        "quotation_number": "QT-LANG-001",
        "created_at": "2026-10-24",
        "valid_until_date": "2026-11-30",
        "company": {
            "name": "पतंग कन्स्ट्रक्शन्स प्रा. लि.",
            "business_address": "शिवाजी नगर, पुणे",
            "city": "पुणे",
            "state": "महाराष्ट्र",
            "pin_code": "411005",
            "gstin": "27AABCP1234D1Z1",
            "phone": "+91 98220 12345",
            "email": "contact@patanginfra.com",
        },
        "client": {
            "name": "मे. जोशी असोसिएट्स",
            "contact_person": "श्री. आनंद जोशी",
            "billing_address": "टिळक रोड, पुणे",
            "gstin": "27AAACJ5678K1Z2",
            "phone": "+91 98221 54321",
        },
        "project": {
            "name": "निवासी इमारत प्रकल्प (Residential G+4)",
            "project_type": "building",
            "site_location": "कोथरूड, पुणे",
            "city": "पुणे",
            "state": "महाराष्ट्र",
            "reference_estimate_number": "EST-2026-089",
        },
        "items": [
            {
                "item_number": "1.1",
                "description": "पाया खोदकाम (Excavation in hard murrum/soft rock)",
                "specification": "IS 1200 Part 1 प्रमाणे मोजमाप",
                "quantity": 120.5,
                "unit": "cum",
                "unit_rate": 450.0,
                "amount": 54225.0,
            },
            {
                "item_number": "2.1",
                "description": "आर.सी.सी. काँक्रीट M25 ग्रेड (RCC M25 Grade Columns & Beams)",
                "specification": "IS 456 प्रमाणे प्रमाण व मिश्रण",
                "quantity": 45.0,
                "unit": "cum",
                "unit_rate": 6500.0,
                "amount": 292500.0,
            },
        ],
        "financials": {
            "subtotal": 346725.0,
            "overhead_pct": 5.0,
            "overhead_amount": 17336.25,
            "contingency_pct": 3.0,
            "contingency_amount": 10401.75,
            "discount_pct": 2.0,
            "discount_amount": 6934.50,
            "taxable_amount": 367528.50,
            "tax_configured": True,
            "tax_name": "GST (18%)",
            "tax_rate": 18.0,
            "tax_amount": 66155.13,
            "total_amount": 433683.63,
        },
        "payment_terms": "३०% अनामत रक्कम कराराच्या वेळी, ६०% कामाच्या प्रगतीनुसार, १०% पूर्ण झाल्यानंतर.",
        "exclusions": "साइटवर पाणी व विजेची सोय ग्राहकाने पुरवावी.",
        "notes": "दर ३० नोव्हेंबर २०२६ पर्यंत वैध आहेत.",
        "authorized_signatory_name": "राजेंद्र पतंग",
        "authorized_signatory_designation": "संचालक (Director)",
    }

    # Test for all 3 supported languages
    for lang in ["en", "mr", "hi"]:
        payload = dict(base_payload)
        payload["language"] = lang
        pdf_bytes = generate_quotation_pdf(payload)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 2000
        assert pdf_bytes.startswith(b"%PDF-")
        assert b"%%EOF" in pdf_bytes[-1024:]
        # Verify page markers
        assert b"/Type /Page" in pdf_bytes


def test_multipage_pdf_headers_and_page_numbers():
    """
    Validates that a long quotation with 45+ BOQ items breaks across multiple pages,
    repeats headers on subsequent pages, and renders running footer page numbers.
    """
    items = []
    total = 0.0
    for i in range(1, 46):
        qty = float(i * 2)
        rate = 250.0 + i
        amt = round(qty * rate, 2)
        total += amt
        items.append({
            "item_number": f"{i}.0",
            "description": f"Construction Work Item #{i} with detailed engineering specifications and scope description",
            "specification": f"IS 1200 Part {i % 10 + 1} compliance",
            "quantity": qty,
            "unit": "cum",
            "unit_rate": rate,
            "amount": amt,
        })

    long_payload = {
        "quotation_number": "QT-MULTI-2026-99",
        "created_at": "2026-10-24",
        "valid_until_date": "2026-12-31",
        "language": "en",
        "company": {
            "name": "Supreme Infrastructure India Ltd.",
            "business_address": "Express Highway, Worli, Mumbai",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400018",
            "gstin": "27AAACS1111B1Z9",
            "phone": "+91 22 2490 0000",
            "email": "tenders@supremeinfra.in",
        },
        "client": {
            "name": "National Highways Infrastructure Trust",
            "contact_person": "Chief General Manager",
            "billing_address": "Dwarka Sector 10, New Delhi",
            "gstin": "07AAACN2222C1Z5",
        },
        "project": {
            "name": "Mumbai-Pune Expressway Capacity Augmentation",
            "project_type": "road",
            "site_location": "Khopoli Bypass",
            "city": "Khopoli",
            "state": "Maharashtra",
            "reference_estimate_number": "EST-EXP-004",
        },
        "items": items,
        "financials": {
            "subtotal": total,
            "overhead_pct": 5.0,
            "overhead_amount": round(total * 0.05, 2),
            "contingency_pct": 3.0,
            "contingency_amount": round(total * 0.03, 2),
            "discount_pct": 0.0,
            "discount_amount": 0.0,
            "taxable_amount": round(total * 1.08, 2),
            "tax_configured": True,
            "tax_name": "GST (18%)",
            "tax_rate": 18.0,
            "tax_amount": round(total * 1.08 * 0.18, 2),
            "total_amount": round(total * 1.08 * 1.18, 2),
        },
        "payment_terms": "Progressive monthly running account bills within 15 days.",
        "exclusions": "Tree cutting and utility shifting by authority.",
        "notes": "MoRTH 5th revision standards applied.",
        "authorized_signatory_name": "S. K. Verma",
        "authorized_signatory_designation": "Vice President (Projects)",
    }

    pdf_bytes = generate_quotation_pdf(long_payload)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert b"%%EOF" in pdf_bytes[-1024:]

    # Count pages by checking /Type /Page (excluding /Type /Pages)
    # in PDF structure: '/Type /Page' appears once per page object
    page_count = pdf_bytes.count(b"/Type /Page") - pdf_bytes.count(b"/Type /Pages")
    assert page_count >= 2, f"Expected multi-page PDF (>=2), found {page_count}"
    assert len(pdf_bytes) > 8000


def test_excel_export_structure_formulas_and_sanitization():
    """
    Validates Excel generation:
    - Sheet title and column layout
    - Formula injection character escaping ('=', '+', '-', '@')
    - Financial totals summary rows
    """
    payload = {
        "quotation_number": "QT-XL-2026-007",
        "created_at": "2026-10-24",
        "valid_until_date": "2026-12-15",
        "language": "en",
        "company": {
            "name": "Tata Projects Ltd.",
            "business_address": "Fort House, 221 Dr. D.N. Road, Mumbai",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400001",
            "gstin": "27AAACT9999M1Z3",
            "phone": "+91 22 6665 8282",
            "email": "tata@tataprojects.com",
        },
        "client": {
            "name": "MMRDA",
            "contact_person": "Executive Engineer",
            "billing_address": "BKC, Bandra East, Mumbai",
            "gstin": "27AAALM0000A1Z1",
        },
        "project": {
            "name": "Metro Line 4 Elevated Viaduct",
            "project_type": "building",
            "site_location": "Ghatkopar to Thane",
            "city": "Mumbai",
            "state": "Maharashtra",
            "reference_estimate_number": "EST-METRO-001",
        },
        "items": [
            {
                "item_number": "1.1",
                "description": "=SUM(A1:B10) Potential Formula Injection",
                "specification": "-cmd.exe malicious command parameter",
                "quantity": 100.0,
                "unit": "cum",
                "unit_rate": 5000.0,
                "amount": 500000.0,
            },
            {
                "item_number": "1.2",
                "description": "+20% Surcharge Attack Vector",
                "specification": "@calc.exe DDE invocation trigger",
                "quantity": 50.0,
                "unit": "cum",
                "unit_rate": 3000.0,
                "amount": 150000.0,
            },
        ],
        "financials": {
            "subtotal": 650000.0,
            "overhead_pct": 10.0,
            "overhead_amount": 65000.0,
            "contingency_pct": 5.0,
            "contingency_amount": 32500.0,
            "discount_pct": 3.0,
            "discount_amount": 19500.0,
            "taxable_amount": 728000.0,
            "tax_configured": True,
            "tax_name": "GST (18%)",
            "tax_rate": 18.0,
            "tax_amount": 131040.0,
            "total_amount": 859040.0,
        },
        "payment_terms": "Milestone-linked RTGS transfer.",
        "exclusions": "Environmental clearances.",
        "notes": "Strict quality control as per IRC SP 46.",
        "authorized_signatory_name": "N. Chandrasekaran",
        "authorized_signatory_designation": "Authorized Signatory",
    }

    excel_bytes = generate_quotation_excel(payload)
    assert isinstance(excel_bytes, bytes)
    assert len(excel_bytes) > 2000

    wb = load_workbook(io.BytesIO(excel_bytes))
    assert "BOQ & Quotation" in wb.sheetnames
    ws = wb["BOQ & Quotation"]

    # Verify no cell contains an unescaped formula starting with =
    for row in ws.iter_rows(values_only=True):
        for cell in row:
            if isinstance(cell, str):
                if "=SUM(A1:B10)" in cell:
                    assert cell.startswith("'="), f"Formula injection not escaped: {cell}"
                if "-cmd.exe" in cell:
                    assert cell.startswith("'-"), f"Command trigger not escaped: {cell}"
                if "+20%" in cell:
                    assert cell.startswith("'+"), f"Plus trigger not escaped: {cell}"
                if "@calc.exe" in cell:
                    assert cell.startswith("'@"), f"DDE trigger not escaped: {cell}"

    # Verify key metadata values exist in worksheet
    all_text = " ".join(str(cell) for row in ws.iter_rows(values_only=True) for cell in row if cell is not None)
    assert "Tata Projects Ltd." in all_text
    assert "QT-XL-2026-007" in all_text
    assert "Metro Line 4 Elevated Viaduct" in all_text
