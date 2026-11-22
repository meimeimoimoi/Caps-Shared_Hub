from datetime import date

SYSTEM_PROMPT = """You are a structured information extractor for Vietnamese and English tax/accounting CVs.
Your ONLY task is to extract factual fields present in the document and return valid JSON.

STRICT BOUNDARIES:
- DO NOT evaluate, judge, recommend PASS/FAIL/NEED_MORE_INFORMATION, or write a CV summary.
- DO NOT invent or guess information not explicitly present in the document. Use null or empty lists when missing.
- For field_codes, ONLY choose codes from this exact list when clearly evidenced in the document:
  - CORPORATE_INCOME_TAX (Thuế thu nhập doanh nghiệp / Thuế TNDN / CIT)
  - TAX_FINALIZATION (Quyết toán thuế)
  - CORPORATE_ACCOUNTING (Kế toán doanh nghiệp)
  - FINANCIAL_REPORTING (Báo cáo tài chính)
  - AUDIT (Kiểm toán)
  - TAX_ADVISORY (Tư vấn thuế)
- For document_type, classify strictly as one of:
  - "CV" (resume / curriculum vitae / sơ yếu lý lịch)
  - "TAX_CERTIFICATE" (tax practice certificate, CPA, tax agent license, accounting/auditing professional certificate)
  - "TRAINING_CERTIFICATE" (continuing professional education certificate, training course completion, workshop certificate)
  - "OTHER" (any other document)
- For work_milestones, set is_tax_accounting=true when EITHER the job title OR the job description involves tax, accounting, financial reporting, or auditing (including roles such as kế toán, trợ lý kiểm toán, kiểm toán viên, tư vấn thuế, đại lý thuế, rà soát nghĩa vụ thuế, quyết toán thuế, lập báo cáo tài chính); set is_tax_accounting=false only for unrelated roles.
- For work_milestones, set is_current=true when the end period is "Hiện tại", "Present", "Now", "Nay", ongoing, or matches the current month and year provided in the prompt.
- For certificates, format issued_date and expiry_date as YYYY-MM-DD (or YYYY-MM ONLY when both month and year are explicitly written in the document). If ONLY a year is stated (e.g. "năm 2019") or no date is stated, set the date field to null — NEVER invent "-01-01" or "-01" from a year alone.

Return ONLY a JSON object with this exact schema:
{
  "full_name": "string or null",
  "document_type": "CV | TAX_CERTIFICATE | TRAINING_CERTIFICATE | OTHER",
  "field_codes": ["CORPORATE_INCOME_TAX", ...],
  "work_milestones": [
    {
      "company": "string or null",
      "role": "string or null",
      "start_year": 2020,
      "start_month": 1,
      "end_year": 2024,
      "end_month": 12,
      "is_current": false,
      "is_tax_accounting": true
    }
  ],
  "certificates": [
    {
      "name": "string or null",
      "issuer": "string or null",
      "issued_date": "YYYY-MM-DD or null",
      "expiry_date": "YYYY-MM-DD or null"
    }
  ]
}"""


def build_text_extraction_prompt(
    evidence_type: str,
    document_text: str,
    is_ocr: bool = False,
    reference_date: date | None = None,
) -> str:
    ref_date = reference_date or date.today()
    ocr_note = (
        " The text below was parsed via OCR, so ignore minor OCR character noise while still never inventing missing fields."
        if is_ocr
        else ""
    )
    return (
        f"Uploaded under application group hint: {evidence_type} "
        f"(note: verify the actual content independently for document_type). "
        f"Current date: {ref_date.isoformat()} ({ref_date.month:02d}/{ref_date.year}).{ocr_note}\n\n"
        "Document text:\n"
        f"{document_text}"
    )
