import type { AssistantAnswer } from "../types"

/* Dữ liệu minh họa: chưa kết nối RAG. Trích dẫn ghi rõ là mẫu để không bị hiểu nhầm là căn cứ thật. */
export async function sendQuestionDemo(
    question: string,
): Promise<AssistantAnswer> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 900)
    })
    return {
        content: `Phản hồi minh họa cho câu hỏi "${question}". Khi kết nối kho tri thức, trợ lý sẽ tổng hợp câu trả lời từ các văn bản Thuế TNDN đã được phê duyệt[1] và đánh số trích dẫn tương ứng với từng ý[2].`,
        citations: [
            {
                id: 'demo-cite-1',
                source: 'Văn bản mẫu A (minh họa)',
                excerpt: 'Trích đoạn văn bản pháp luật sẽ hiển thị tại đây.',
            },
            {
                id: 'demo-cite-2',
                source: 'Văn bản mẫu B (minh họa)',
                excerpt: 'Điều khoản liên quan sẽ hiển thị tại đây.',
            },
        ],
    }
}
