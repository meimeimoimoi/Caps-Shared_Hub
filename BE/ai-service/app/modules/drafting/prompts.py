import json
from typing import Any

NO_APPROVED_LEGAL_BASIS_NOTE = (
    "Chưa có căn cứ pháp lý đã được phê duyệt trong kho tri thức cho kỳ tính thuế này; "
    "nội dung bản nháp chỉ tổng hợp dữ kiện do người dùng cung cấp và cần chuyên gia rà soát trước khi sử dụng."
)


def build_draft_prompt(
    snapshot_data: dict,
    template_schema: Any,
    legal_context: str,
) -> str:
    snapshot_json = json.dumps(snapshot_data, ensure_ascii=False)
    template_json = json.dumps(template_schema, ensure_ascii=False)
    has_legal_context = bool(legal_context and legal_context.strip())

    if has_legal_context:
        return f"""Bạn là Trợ lý soạn thảo văn bản giải trình Thuế Thu nhập doanh nghiệp (TNDN).
Dữ liệu đầu vào (Input Snapshot):
{snapshot_json}

Cấu trúc mẫu biểu (Template):
{template_json}

Căn cứ luật được phê duyệt:
{legal_context.strip()}

NGUYÊN TẮC BẮT BUỘC:
1. Trả về một đối tượng JSON hợp lệ bao gồm:
   - Đầy đủ các trường có trong Cấu trúc mẫu biểu (Template) với dữ liệu lấy từ Input Snapshot.
   - Trường "noi_dung_giai_trinh": đoạn văn hành chính thuyết minh, diễn giải mạch lạc nội dung giải trình dựa trên dữ kiện trong Input Snapshot.
   - Trường "can_cu_phap_ly": nêu rõ việc đối chiếu theo đúng Số hiệu văn bản, Điều, Khoản có trong phần Căn cứ luật được phê duyệt ở trên.
2. TUYỆT ĐỐI KHÔNG TỰ TÍNH TOÁN HOẶC ĐƯA THÊM BẤT KỲ CON SỐ NÀO ngoài các con số đã có trong Input Snapshot và số hiệu văn bản, điều, khoản của Căn cứ luật ở trên. Không đánh số thứ tự bằng chữ số trong lời văn.
3. TUYỆT ĐỐI KHÔNG TỰ BỊA RA CĂN CỨ PHÁP LÝ ngoài phần Căn cứ luật được phê duyệt ở trên.
Trả về định dạng JSON duy nhất."""

    return f"""Bạn là Trợ lý soạn thảo văn bản giải trình doanh nghiệp.
Dữ liệu đầu vào (Input Snapshot):
{snapshot_json}

Cấu trúc mẫu biểu (Template):
{template_json}

Tình trạng căn cứ pháp lý: KHÔNG CÓ căn cứ pháp lý được phê duyệt nào trong kho tri thức cho kỳ tính thuế này.

NGUYÊN TẮC BẮT BUỘC:
1. Trả về một đối tượng JSON hợp lệ bao gồm:
   - Đầy đủ các trường có trong Cấu trúc mẫu biểu (Template) với dữ liệu lấy nguyên từ Input Snapshot.
   - Trường "noi_dung_giai_trinh": đoạn văn hành chính trình bày lại đúng sự việc và số liệu do người dùng cung cấp trong Input Snapshot.
   - Trường "can_cu_phap_ly": ghi nguyên văn "{NO_APPROVED_LEGAL_BASIS_NOTE}".
2. NGHIÊM CẤM nhắc tới bất kỳ Luật, Nghị định, Thông tư, Quyết định, Điều, Khoản nào từ kiến thức bên ngoài (vì kho tri thức chưa có căn cứ cho kỳ này).
3. NGHIÊM CẤM đưa thêm bất kỳ chữ số hay con số nào không xuất hiện trong Input Snapshot (không đánh số mục 1, 2, 3; không tự tính toán thuế).
Trả về định dạng JSON duy nhất."""
