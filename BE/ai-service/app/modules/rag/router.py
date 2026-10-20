from app.core.ai_response import parse_ai_response
from app.schemas.ai_results import ScopeAnalysis
from app.modules.rag.prompts import build_scope_prompt
from app.core.models import llm_model

class ScopeRouter:
    @staticmethod
    def analyze(question: str, user_tax_period: str | None = None) -> ScopeAnalysis:
        prompt = build_scope_prompt(question)
        if user_tax_period:
            prompt += f"\nKỳ thuế do người dùng cung cấp: {user_tax_period}"
        res = llm_model.invoke(prompt)
        return parse_ai_response(res.content, ScopeAnalysis)
