from app.core.models import llm_model

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

        prompt = f"""Bạn là Trợ lý AI Pháp lý Thuế TNDN. Chỉ trả lời dựa trên Căn cứ pháp lý dưới đây.
TUYỆT ĐỐI KHÔNG SUY DIỄN NGOÀI CĂN CỨ.

Căn cứ pháp lý:
{context}

Kỳ thuế áp dụng: {period_str}
Câu hỏi: {question}

QUY TẮC:
1. Nếu thông tin không đủ để kết luận, hãy trả lời chính xác: "Căn cứ pháp lý được cung cấp chưa đủ để đưa ra kết luận chắc chắn cho tình huống này."
2. BẮT BUỘC liệt kê mục "Căn cứ pháp lý trích dẫn:" ở cuối câu trả lời (ghi rõ Tên văn bản, Số hiệu, Điều, Khoản)."""

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