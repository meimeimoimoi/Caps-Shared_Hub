const suggestedQuestion = [
    'Chi phí lại vay được trừ tối đa bao nhiêu?',
    'Hóa đơn thanh toán tiền mặt có được tính vào chi phí được trừ không.',
    'Thuế suất Thuế TNDN áp dụng cho kỳ thuế của tôi là bao nhiêu.',
    'Chi phí Phúc lợi cho nhân viên được trừ ở mức nào.',
]

type AssitantWelcomeProps = {
    onSelectQuestion: (question: string) => void
}

export function AssitantWelcome({
    onSelectQuestion,
} : AssitantWelcomeProps) {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-4xl font-bold">Hỏi về Thuế TNDN</h2>
                <p className="mt-3 leading-7 text-gray-600">
                    Trả lời có căn cứ pháp lý, trích từ kho văn bản Thuế TNDN
                </p>
            </div>

            <section aria-labelledby="suggested-questions-title">
                <h3 id="suggested-questions-title" 
                    className="mb-3 text-sm font-semibold text-gray-700">
                        Câu hỏi thường gặp
                </h3>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {suggestedQuestion.map((question) => (
                        <li key={question}>
                            <button type="button" onClick={() => onSelectQuestion(question)}
                            className="h-full w-full rounded-lg border border-[#E4E4E1] bg-white px-4 py-3 text-left text-sm leading-6 text-gray-700 transition-colors hover:bg-[#F7F7F5]">
                            {question}
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
} 