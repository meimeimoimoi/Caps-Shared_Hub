import hashlib
import json
import re

from app.core.ai_response import parse_ai_response
from app.core.models import llm_model
from app.modules.drafting.prompts import build_draft_prompt
from app.schemas.ai_results import DraftContent


class DocumentDrafter:
    @staticmethod
    def generate_draft(
        snapshot_data: dict, template_schema: dict, legal_context: str
    ) -> dict:
        prompt = build_draft_prompt(
            snapshot_data=snapshot_data,
            template_schema=template_schema,
            legal_context=legal_context,
        )
        res = llm_model.invoke(prompt)
        draft_content = parse_ai_response(res.content, DraftContent).root

        # Guardrail: detect numbers absent from the input snapshot.
        input_numbers = set(
            re.findall(r"\b\d+(?:[.,]\d+)?\b", json.dumps(snapshot_data))
        )
        output_numbers = set(
            re.findall(r"\b\d+(?:[.,]\d+)?\b", json.dumps(draft_content))
        )
        unauthorized = list(output_numbers - input_numbers)

        # Hash the canonical content for integrity checks.
        content_hash = hashlib.sha256(
            json.dumps(draft_content, sort_keys=True).encode("utf-8")
        ).hexdigest()

        return {
            "content": draft_content,
            "content_hash": content_hash,
            "has_unauthorized_numbers": len(unauthorized) > 0,
            "unauthorized_numbers": unauthorized,
        }
