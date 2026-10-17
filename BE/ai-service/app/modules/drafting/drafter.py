import hashlib
import json
import re
from app.core.models import llm_model

class DocumentDrafter:
    @staticmethod
    def generate_draft(snapshot_data: dict, template_schema: dict, legal_context: str) -> dict:
        prompt = f"""Bạn là Trợ lý soạn thảo văn bản giải trình Thuế TNDN.
Dữ liệu đầu vào (Input Snapshot):
{json.dumps(snapshot_data, ensure_ascii=False)}

Cấu trúc mẫu biểu (Template):
{json.dumps(template_schema, ensure_ascii=False)}

Căn cứ luật:
{legal_context}

NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. Điền vào biểu mẫu dưới dạng JSON.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA RA SỐ LIỆU TÀI CHÍNH MỚI. Chỉ sử dụng đúng các con số có trong Input Snapshot.
Trả về định dạng JSON duy nhất."""

        res = llm_model.invoke(prompt)
        text = res.content.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        draft_content = json.loads(match.group(0)) if match else {"raw": text}

        # Guardrail: Kiểm tra xem AI có tự bịa số không
        input_numbers = set(re.findall(r'\b\d+(?:[.,]\d+)?\b', json.dumps(snapshot_data)))
        output_numbers = set(re.findall(r'\b\d+(?:[.,]\d+)?\b', json.dumps(draft_content)))
        unauthorized = list(output_numbers - input_numbers)

        # Tính mã băm SHA-256 để bảo vệ tính bất biến
        content_hash = hashlib.sha256(json.dumps(draft_content, sort_keys=True).encode('utf-8')).hexdigest()

        return {
            "content": draft_content,
            "content_hash": content_hash,
            "has_unauthorized_numbers": len(unauthorized) > 0,
            "unauthorized_numbers": unauthorized
        }