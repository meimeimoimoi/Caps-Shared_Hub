from app.core.models import llm_model
from app.modules.rag.prompts import build_grounded_answer_prompt

class GroundedGenerator:
    @staticmethod
    def generate_answer(question: str, retrieved_chunks: list, period_str: str) -> dict:
        # Step 5: Retrieval Sufficiency Check
        if not retrieved_chunks:
            return {
                "answer_status": "INSUFFICIENT_KNOWLEDGE",
                "answer": "Kho tri thức hiện chưa có căn cứ pháp lý đã được phê duyệt áp dụng cho kỳ thuế này. Hệ thống đề xuất bạn chuyển tiếp câu hỏi cho Chuyên gia để thẩm định.",
                "citations": []
            }

        context = "\n---\n".join([h.payload["text_content"] for h in retrieved_chunks])

        prompt = build_grounded_answer_prompt(
            question=question,
            context=context,
            period_str=period_str,
        )
        res = llm_model.invoke(prompt)

        # Chuẩn hóa Citations trả về cho .NET
        citations = []
        for h in retrieved_chunks:
            p = h.payload
            citations.append({
                "legal_source_id": p.get("legal_source_id"),
                "document_number": p.get("document_number"),
                "article": p.get("article"),
                "clause": p.get("clause"),
                "point": p.get("point")
            })

        return {
            "answer_status": "SUCCESS",
            "answer": res.content,
            "citations": citations
        }