def build_scope_prompt(question: str, user_tax_period: str | None = None) -> str:
    period_line = (
        f'\nKỳ thuế đi kèm trong yêu cầu: "{user_tax_period.strip()}"'
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
Quy tắc:
1. is_cit:
   - Đặt true CHỈ KHI câu hỏi liên quan trực tiếp đến Thuế Thu nhập doanh nghiệp (TNDN / CIT) của doanh nghiệp/tổ chức (doanh thu tính thuế TNDN, chi phí được trừ/không được trừ, thuế suất TNDN, ưu đãi/miễn giảm TNDN, chuyển lỗ, tạm nộp/quyết toán TNDN).
   - Đặt false với mọi chủ đề ngoài TNDN, đặc biệt:
     * Thuế Thu nhập cá nhân (TNCN / PIT), kể cả khi không viết chữ "TNCN" như: giảm trừ gia cảnh, người phụ thuộc, quyết toán lương/thù lao cá nhân.
     * Hộ kinh doanh, cá nhân kinh doanh, thuế khoán.
     * Thuế GTGT (VAT) thuần túy, thuế xuất nhập khẩu, kế toán nội bộ, câu hỏi đời sống.
2. period_start và period_end: lấy từ câu hỏi hoặc kỳ thuế đi kèm và quy đổi sang "YYYY-MM-DD" (năm 2025 -> "2025-01-01" đến "2025-12-31"; quý 1/2025 -> "2025-01-01" đến "2025-03-31").
3. needs_clarification và clarification_msg:
   - Chỉ đặt needs_clarification = true khi is_cit = true nhưng chưa xác định được năm hoặc kỳ tính thuế áp dụng.
   - Khi needs_clarification = true, clarification_msg PHẢI là một câu hỏi tiếng Việt lịch sự gửi người dùng cuối để hỏi dữ kiện thiếu (ví dụ: "Vui lòng cho biết bạn muốn tra cứu cho năm hoặc kỳ tính thuế nào?"). KHÔNG viết các nhãn kỹ thuật như "Kỳ thuế đi kèm", "Kỳ thuế do người dùng cung cấp" hay "user_tax_period".
   - Khi đã xác định được period_start và period_end (hoặc is_cit = false), đặt needs_clarification = false và clarification_msg = null.

Ví dụ mẫu:
- Câu hỏi: "Mức giảm trừ gia cảnh cho bản thân là bao nhiêu?" -> {{"is_cit": false, "period_start": null, "period_end": null, "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Tháng 3/2026 hộ kinh doanh nộp thuế khoán thế nào?" -> {{"is_cit": false, "period_start": null, "period_end": null, "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Năm 2024 chi phí nào được trừ khi tính thuế TNDN?" -> {{"is_cit": true, "period_start": "2024-01-01", "period_end": "2024-12-31", "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Thuế suất TNDN phổ thông là bao nhiêu?" -> {{"is_cit": true, "period_start": null, "period_end": null, "needs_clarification": true, "clarification_msg": "Vui lòng cho biết bạn muốn tra cứu thuế suất TNDN cho năm hoặc kỳ tính thuế nào?"}}"""


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