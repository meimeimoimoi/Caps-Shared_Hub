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
   - Đặt true CHỈ KHI câu hỏi liên quan trực tiếp đến Thuế Thu nhập doanh nghiệp (TNDN / CIT) của doanh nghiệp/tổ chức (doanh thu tính thuế TNDN, chi phí được trừ/không được trừ khi tính thuế TNDN, thuế suất TNDN, ưu đãi/miễn giảm TNDN, chuyển lỗ, tạm nộp/quyết toán TNDN).
   - Đặt false với mọi chủ đề ngoài TNDN, đặc biệt:
     * Thuế Thu nhập cá nhân (TNCN / PIT), kể cả khi câu hỏi nhắc tới "doanh nghiệp/công ty" khấu trừ, kê khai hoặc quyết toán thuế TNCN cho nhân viên/người lao động, giảm trừ gia cảnh, người phụ thuộc, biểu thuế lũy tiến từng phần, thu nhập vãng lai.
     * Hộ kinh doanh, cá nhân kinh doanh, thuế khoán.
     * Thuế GTGT (VAT) thuần túy, lệ phí môn bài, lệ phí trước bạ, thuế xuất nhập khẩu, kế toán nội bộ, câu hỏi đời sống.
2. period_start và period_end: lấy từ câu hỏi hoặc kỳ thuế đi kèm và quy đổi sang "YYYY-MM-DD" (năm 2025 -> "2025-01-01" đến "2025-12-31"; quý 1/2025 -> "2025-01-01" đến "2025-03-31").
3. needs_clarification và clarification_msg:
   - Chỉ đặt needs_clarification = true khi is_cit = true nhưng chưa xác định được năm hoặc kỳ tính thuế áp dụng.
   - Khi needs_clarification = true, clarification_msg PHẢI là một câu hỏi tiếng Việt lịch sự gửi người dùng cuối để hỏi dữ kiện thiếu (ví dụ: "Vui lòng cho biết bạn muốn tra cứu cho năm hoặc kỳ tính thuế nào?"). KHÔNG viết các nhãn kỹ thuật như "Kỳ thuế đi kèm", "Kỳ thuế do người dùng cung cấp" hay "user_tax_period".
   - Khi đã xác định được period_start và period_end (hoặc is_cit = false), đặt needs_clarification = false và clarification_msg = null.

Ví dụ mẫu:
- Câu hỏi: "Mức giảm trừ gia cảnh cho bản thân là bao nhiêu?" -> {{"is_cit": false, "period_start": null, "period_end": null, "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Doanh nghiệp khấu trừ thuế TNCN cho nhân viên thử việc như thế nào?" -> {{"is_cit": false, "period_start": null, "period_end": null, "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Tháng 3/2026 hộ kinh doanh nộp thuế khoán thế nào?" -> {{"is_cit": false, "period_start": null, "period_end": null, "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Năm 2026 chi phí nào được trừ khi tính thuế TNDN?" -> {{"is_cit": true, "period_start": "2026-01-01", "period_end": "2026-12-31", "needs_clarification": false, "clarification_msg": null}}
- Câu hỏi: "Thuế suất TNDN phổ thông là bao nhiêu?" -> {{"is_cit": true, "period_start": null, "period_end": null, "needs_clarification": true, "clarification_msg": "Vui lòng cho biết bạn muốn tra cứu thuế suất TNDN cho năm hoặc kỳ tính thuế nào?"}}"""


def build_grounded_answer_prompt(
    question: str,
    context: str,
    period_str: str,
    retry_note: str | None = None,
) -> str:
    retry_block = f"\n\nLƯU Ý SỬA LẠI: {retry_note}" if retry_note else ""
    return f"""Bạn là Trợ lý AI Pháp lý Thuế Thu nhập doanh nghiệp (TNDN). Chỉ trả lời dựa trên Căn cứ pháp lý truy xuất dưới đây.
TUYỆT ĐỐI KHÔNG SUY DIỄN HOẶC BỊA THÊM QUY ĐỊNH NGOÀI CĂN CỨ.

Căn cứ pháp lý truy xuất:
{context}

Kỳ thuế áp dụng: {period_str}
Câu hỏi: {question}

YÊU CẦU TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (không giải thích ngoài JSON). Mọi giá trị "facts", "legal_basis", "conclusion" là CHUỖI văn bản, không lồng đối tượng JSON:
{{
  "answerable": true hoặc false,
  "used_sources": [số thứ tự các đoạn căn cứ đã dùng, ví dụ 1, 3],
  "facts": "...",
  "legal_basis": "...",
  "conclusion": "..."
}}

QUY TẮC BẮT BUỘC:
0. "answerable": đặt true CHỈ KHI có ít nhất một đoạn căn cứ nêu TRỰC TIẾP nội dung trả lời câu hỏi (đúng mẫu biểu, đúng chỉ tiêu, đúng phụ lục, đúng mức số được hỏi). Đặt false khi các đoạn chỉ nói về chủ đề gần giống, hoặc phải đoán, suy luận thêm mới trả lời được. Ví dụ: hỏi một phụ lục hay chỉ tiêu trên tờ khai mà không đoạn nào mô tả phụ lục, chỉ tiêu đó thì answerable = false. Khi answerable = false, để "used_sources" là [] và "conclusion" là chuỗi rỗng.
1. "used_sources": chỉ liệt kê số thứ tự [n] của các đoạn thật sự dùng để trả lời; không liệt kê đoạn không dùng.
2. "facts" (Dữ kiện): Tóm tắt đúng câu hỏi hoặc tình huống người dùng đưa ra kèm kỳ tính thuế áp dụng ({period_str}); chỉ nêu những gì có trong câu hỏi, không tự thêm giả định.
3. "legal_basis" (Căn cứ): Trích dẫn Số hiệu văn bản, Tên văn bản, Điều, Khoản, Điểm của các đoạn đã dùng (gắn ký hiệu [1], [2]...) và nội dung quy định tương ứng. Chỉ được nêu số hiệu văn bản xuất hiện trong Căn cứ pháp lý truy xuất. Lưu ý: khoản quy định mức thuế suất chung 20% chính là mức thuế suất thuế TNDN phổ thông.
4. "conclusion" (Kết luận): Trả lời trực tiếp, rõ ràng cho câu hỏi dựa trên phần Căn cứ (kèm [1], [2]...). Không đưa ra con số, mẫu biểu, chỉ tiêu hay văn bản không có trong các đoạn đã dùng.{retry_block}"""
