import json
import re
from app.modules.rag.prompts import build_scope_prompt
from app.core.models import llm_model

class ScopeRouter:
    @staticmethod
    def analyze(question: str) -> dict:
        prompt = build_scope_prompt(question)
        res = llm_model.invoke(prompt)
        text = res.content.strip()
        
        # Bóc tách JSON an toàn bằng Regex
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {"is_cit": True, "period_start": None, "period_end": None, "needs_clarification": False}