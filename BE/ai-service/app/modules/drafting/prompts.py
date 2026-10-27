import json


def build_draft_prompt(
    snapshot_data: dict,
    template_schema: dict,
    legal_context: str,
) -> str:
    snapshot_json = json.dumps(snapshot_data, ensure_ascii=False)
    template_json = json.dumps(template_schema, ensure_ascii=False)

    return f"""Bạn là Trợ lý soạn thảo văn bản giải trình Thuế TNDN.
Dữ liệu đầu vào (Input Snapshot):
{snapshot_json}

Cấu trúc mẫu biểu (Template):
{template_json}

Căn cứ luật:
{legal_context}

NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. Điền vào biểu mẫu dưới dạng JSON.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA RA SỐ LIỆU TÀI CHÍNH MỚI. Chỉ sử dụng đúng các con số có trong Input Snapshot.
Trả về định dạng JSON duy nhất."""
