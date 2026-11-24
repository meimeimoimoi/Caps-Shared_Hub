import json
from typing import Any


def build_draft_prompt(
    snapshot_data: dict,
    template_schema: Any,
    legal_context: str,
) -> str:
    snapshot_json = json.dumps(snapshot_data, ensure_ascii=False)
    template_json = json.dumps(template_schema, ensure_ascii=False)
    has_legal_context = bool(legal_context and legal_context.strip())
    legal_block = (
        legal_context.strip()
        if has_legal_context
        else "(KHÔNG CÓ CĂN CỨ PHÁP LÝ ĐƯỢC PHÊ DUYỆT NÀO ĐƯỢC TRUY XUẤT CHO KỲ TÍNH THUẾ NÀY)"
    )

    return f"""Bạn là Trợ lý soạn thảo văn bản giải trình Thuế TNDN.
Dữ liệu đầu vào (Input Snapshot):
{snapshot_json}

Cấu trúc mẫu biểu (Template):
{template_json}

Căn cứ luật:
{legal_block}

NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. Điền vào biểu mẫu dưới dạng JSON.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA RA SỐ LIỆU TÀI CHÍNH MỚI. Chỉ sử dụng đúng các con số có trong Input Snapshot.
3. TUYỆT ĐỐI KHÔNG TỰ TẠO HOẶC BỊA RA CĂN CỨ PHÁP LÝ (số hiệu văn bản, điều, khoản, điểm) nếu không có trong phần Căn cứ luật ở trên. Khi không có căn cứ pháp lý áp dụng, hãy ghi rõ chưa có căn cứ pháp lý được phê duyệt để đối chiếu.
Trả về định dạng JSON duy nhất."""
