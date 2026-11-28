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
   - Đặt true CHỈ KHI câu hỏi liên quan trực tiếp đến Thuế Thu nhập doanh nghiệp (TNDN / CIT) của doanh nghiệp/tổ chức (doanh thu tính thuế TNDN, chi phí được trừ/không được trừ, khấu hao tài sản cố định, thuế suất TNDN, chuyển lỗ, tạm nộp/quyết toán TNDN), kể cả khi câu hỏi gõ tiếng Việt KHÔNG DẤU (ví dụ: "chi phi khau hao o to nam 2026 duoc tru bao nhieu", "thue suat tndn") hoặc doanh nghiệp có dự án đầu tư / nằm trong khu công nghệ cao nhưng đang hỏi quy định TNDN chung.
   - Đặt false với mọi chủ đề ngoài TNDN hoặc ưu đãi thuế theo dự án đầu tư, đặc biệt:
     * Ưu đãi thuế TNDN theo dự án đầu tư, địa bàn ưu đãi, ngành nghề ưu đãi.
     * Thuế Thu nhập cá nhân (TNCN / PIT), kể cả khi câu hỏi nhắc tới "doanh nghiệp/công ty" khấu trừ, kê khai hoặc quyết toán thuế TNCN cho nhân viên/người lao động, giảm trừ gia cảnh, người phụ thuộc, biểu thuế lũy tiến từng phần, thu nhập vãng lai.
     * Hộ kinh doanh, cá nhân kinh doanh, thuế khoán.
     * Thuế GTGT (VAT) thuần túy, lệ phí môn bài, lệ phí trước bạ, thuế xuất nhập khẩu, kế toán nội bộ, câu hỏi đời sống.
2. period_start và period_end:
   - Lấy từ câu hỏi hoặc kỳ thuế đi kèm và quy đổi sang "YYYY-MM-DD" (năm 2025 / nam 2025 / in 2025 -> "2025-01-01" đến "2025-12-31"; quý 1/2025 -> "2025-01-01" đến "2025-03-31").
   - Nếu câu hỏi vừa nêu kỳ tính thuế/quyết toán vừa nêu năm phát sinh sự kiện quá khứ (ví dụ: lỗ năm 2024 chuyển sang kỳ 2025, tài sản mua năm 2023), kỳ tính thuế áp dụng là năm tính thuế/quyết toán (2025), KHÔNG lấy năm phát sinh lỗ/mua tài sản.
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
    calc_hint_block: str | None = None,
) -> str:
    retry_block = f"\n\nLƯU Ý SỬA LẠI: {retry_note}" if retry_note else ""
    calc_block = f"\n\n{calc_hint_block}" if calc_hint_block else ""
    return f"""Bạn là Trợ lý AI Pháp lý Thuế Thu nhập doanh nghiệp (TNDN). Chỉ trả lời dựa trên Căn cứ pháp lý truy xuất dưới đây.
TUYỆT ĐỐI KHÔNG SUY DIỄN HOẶC BỊA THÊM QUY ĐỊNH NGOÀI CĂN CỨ.

Căn cứ pháp lý truy xuất:
{context}

Kỳ thuế áp dụng: {period_str}
Câu hỏi: {question}{calc_block}

YÊU CẦU TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (không giải thích ngoài JSON). Giá trị "conclusion" là CHUỖI văn bản, không lồng đối tượng JSON:
{{
  "answerable": true hoặc false,
  "used_sources": [số thứ tự các đoạn căn cứ đã dùng, ví dụ 1, 3],
  "conclusion": "..."
}}

QUY TẮC BẮT BUỘC:
0. "answerable":
   - Đặt true KHI có ít nhất một đoạn căn cứ quy định trực tiếp về vấn đề được hỏi, BAO GỒM CẢ:
     a) Câu hỏi xác nhận Đúng/Sai ("... đúng không?", "có phải ... không?"): ngay cả khi con số, thời hạn hoặc tên văn bản người dùng giả định trong câu hỏi là SAI so với căn cứ (ví dụ hỏi thuế suất 22% trong khi luật quy định 20%; hỏi chuyển lỗ 7 năm trong khi luật quy định không quá 05 năm; hỏi doanh thu 40 tỷ hưởng 17% trong 10 năm trong khi điều luật về mức 17% theo doanh thu không quy định thời hạn 10 năm), PHẢI đặt answerable = true để bác bỏ phần sai ("Không đúng") và nêu quy định đúng theo căn cứ. Chỉ xác nhận "Đúng" khi TẤT CẢ chi tiết trong câu hỏi đều có mặt trong cùng quy định đó.
     b) Câu hỏi cho mức doanh thu cụ thể hoặc bài toán tính thuế TNDN: khi căn cứ đã nêu ngưỡng doanh thu (không quá 03 tỷ -> 15%; trên 03 tỷ đến không quá 50 tỷ -> 17%; mức thuế suất chung/phổ thông trên 50 tỷ -> 20%) và công thức tính thuế trên thu nhập tính thuế, đặt answerable = true. Nếu hệ thống đã cung cấp mục "KẾT QUẢ TÍNH THUẾ ĐÃ KIỂM TOÁN" ở trên thì BẮT BUỘC dùng đúng con số đó; nếu không có kết quả tính sẵn mà dữ kiện phức tạp thì chỉ nêu công thức và mức thuế suất theo căn cứ, KHÔNG tự tính nhẩm.
        * Lưu ý phân biệt: Doanh nghiệp xác định được thu nhập chịu thuế/chi phí thì nhân thuế suất (15%/17%/20%) với thu nhập tính thuế sau khi trừ lỗ kết chuyển; TUYỆT ĐỐI không trộn với tỷ lệ % trên doanh thu. Chỉ khi không xác định được chi phí/thu nhập mới tính theo tỷ lệ % trên doanh thu, và phải liệt kê đầy đủ các mức tỷ lệ theo từng ngành nghề có trong đoạn căn cứ.
   - Đặt false KHI các đoạn căn cứ không chứa quy định về chủ đề được hỏi, hoặc câu hỏi hỏi mẫu biểu, phụ lục, chỉ tiêu tờ khai cụ thể (ví dụ Phụ lục 03-2, chỉ tiêu B4) mà không đoạn căn cứ nào mô tả mẫu biểu/chỉ tiêu đó. Khi answerable = false, để "used_sources" là [] và "conclusion" là "".
1. "used_sources": chỉ liệt kê số thứ tự [n] của các đoạn thật sự đỡ trực tiếp câu kết luận; không liệt kê đoạn thừa (ví dụ hỏi mức giảm 30% thì chỉ chọn điều khoản quy định mức giảm 30%). Lưu ý: khoản quy định mức thuế suất chung 20% chính là mức thuế suất thuế TNDN phổ thông.
2. "conclusion" (Kết luận):
   - Trả lời ngắn gọn, trực tiếp đúng trọng tâm câu hỏi kèm ký hiệu [1], [2]... Chỉ được nêu số hiệu văn bản xuất hiện trong các đoạn thuộc "used_sources"; nếu câu hỏi nhắc tới một văn bản không có trong các đoạn đã dùng thì TUYỆT ĐỐI không gán quy định cho văn bản đó.
   - TUYỆT ĐỐI KHÔNG viết thêm câu phụ, ví dụ phụ hay lưu ý về các khoản chi/trường hợp khác mà người dùng không hỏi.
   - GIỮ NGUYÊN ĐIỀU KIỆN ÁP DỤNG bắt buộc trong điều luật (ví dụ: miễn thuế 02 năm chỉ áp dụng cho doanh nghiệp thành lập mới từ hộ kinh doanh; lỗ chuyển nhượng bất động sản chỉ không được bù trừ với thu nhập của dự án đang hưởng ưu đãi thuế). Không cắt bỏ điều kiện khiến quy định hẹp biến thành áp dụng đại trà.
   - Giữ chính xác nghĩa khẳng định/phủ định ("được trừ" khác hoàn toàn "không được trừ" / "không tính vào chi phí được trừ"): mọi phần chi hoặc khấu hao VƯỢT mức trần quy định đều là KHÔNG được trừ.
   - Không ghép nhầm thời hạn ưu đãi dự án đầu tư (như 10 năm, 15 năm) sang mức thuế suất 15%/17% theo quy mô doanh thu. Mọi con số, tỷ lệ %, mức tiền trần và thời hạn nêu khẳng định trong kết luận phải xuất hiện trong các đoạn đã dùng (hoặc trong mục KẾT QUẢ TÍNH THUẾ ĐÃ KIỂM TOÁN).{retry_block}"""
