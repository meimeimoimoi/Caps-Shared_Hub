import json
import re
from app.core.models import llm_model

class ScopeRouter:
    @staticmethod
    def analyze(question: str) -> dict:
        prompt = f"""Bạn là chuyên gia phân loại câu hỏi pháp lý Thuế Thu nhập doanh nghiệp (TNDN / CIT) Việt Nam.
Hãy phân tích câu hỏi sau: "{question}"

YÊU CẦU TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không giải thích thêm):
{{
  "is_cit": true/false,
  "period_start": "YYYY-MM-DD" hoặc null,
  "period_end": "YYYY-MM-DD" hoặc null,
  "needs_clarification": true/false,
  "clarification_msg": "..." hoặc null
}}
Lưu ý quy tắc:
1. is_cit: False nếu hỏi về thuế TNCN, VAT thuần túy, kế toán nội bộ, hoặc việc không liên quan đến thuế TNDN.
2. needs_clarification: True nếu câu hỏi hỏi về việc tính chi phí / ưu đãi / thuế suất nhưng KHÔNG nhắc đến năm hoặc thời gian phát sinh giao dịch."""

        res = llm_model.invoke(prompt)
        text = res.content.strip()
        
        # Bóc tách JSON an toàn bằng Regex
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {"is_cit": True, "period_start": None, "period_end": None, "needs_clarification": False}