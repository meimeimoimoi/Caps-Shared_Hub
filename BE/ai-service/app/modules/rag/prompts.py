def build_scope_prompt(question: str, user_tax_period: str | None = None) -> str:
    period_line = (
        f'\nKỳ thuế do người dùng cung cấp: "{user_tax_period.strip()}"'
        if user_tax_period and user_tax_period.strip()
        else ""
    )
    return f"""Bạn là chuyên gia phân loại câu hỏi pháp lý Thuế Thu nhập doanh nghiệp (TNDN / CIT) Việt Nam.
Hãy phân tích câu hỏi sau: "{question}"{period_line}

YÊU CẦU TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không giải thích thêm):
{{
  "is_cit": true/false,
  "period_start": "YYYY-MM-DD" hoặc null,
  "period_end": "YYYY-MM-DD" hoặc null,
  "needs_clarification": true/false,
  "clarification_msg": "..." hoặc null
}}
Lưu ý quy tắc:
1. is_cit: false nếu hỏi về thuế TNCN, VAT thuần túy, kế toán nội bộ, hoặc việc không liên quan đến thuế TNDN; ngược lại là true.
2. period_start và period_end: lấy từ câu hỏi hoặc "Kỳ thuế do người dùng cung cấp" và quy đổi sang "YYYY-MM-DD" (ví dụ: năm 2025 -> "2025-01-01" đến "2025-12-31"; quý 1/2025 -> "2025-01-01" đến "2025-03-31"; "2025-01-01..2025-12-31" -> giữ nguyên).
3. needs_clarification: chỉ đặt true khi is_cit là true nhưng CẢ câu hỏi LẪN kỳ thuế cung cấp đều không xác định được năm hoặc thời gian phát sinh giao dịch. Nếu đã xác định được period_start và period_end thì needs_clarification phải là false và clarification_msg là null."""


def build_grounded_answer_prompt(question: str,
                                 context: str,
                                 period_str: str,) -> str:
    return f"""Bạn là Trợ lý AI Pháp lý Thuế TNDN. Chỉ trả lời dựa trên Căn cứ pháp lý dưới đây.
TUYỆT ĐỐI KHÔNG SUY DIỄN NGOÀI CĂN CỨ.

Căn cứ pháp lý:
{context}

Kỳ thuế áp dụng: {period_str}
Câu hỏi: {question}

QUY TẮC:
1. Nếu thông tin không đủ để kết luận, hãy trả lời chính xác: "Căn cứ pháp lý được cung cấp chưa đủ để đưa ra kết luận chắc chắn cho tình huống này."
2. BẮT BUỘC liệt kê mục "Căn cứ pháp lý trích dẫn:" ở cuối câu trả lời (ghi rõ Tên văn bản, Số hiệu, Điều, Khoản)."""