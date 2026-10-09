const suggestedQuestion = [
    'Chi phí lãi vay được trừ tối đa bao nhiêu?',
    'Hóa đơn thanh toán tiền mặt có được tính vào chi phí được trừ không.',
    'Thuế suất Thuế TNDN áp dụng cho kỳ thuế của tôi là bao nhiêu.',
    'Chi phí Phúc lợi cho nhân viên được trừ ở mức nào.',
]

type AssistantWelcomeProps = {
    onSelectQuestion: (question: string) => void
}

export function AssistantWelcome({
    onSelectQuestion,
} : AssistantWelcomeProps) {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-4xl font-bold">Hỏi về Thuế TNDN</h2>
                <p className="mt-3 leading-7 text-fg-muted">
                    Trả lời có căn cứ pháp lý, trích từ kho văn bản Thuế TNDN
                </p>
            </div>

            <section aria-labelledby="suggested-questions-title">
                <h3 id="suggested-questions-title" 
                    className="mb-3 text-sm font-semibold text-fg">
                        Câu hỏi thường gặp
                </h3>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {suggestedQuestion.map((question) => (
                        <li key={question}>
                            <button type="button" onClick={() => onSelectQuestion(question)}
                            className="h-full w-full rounded-lg border border-border bg-paper px-4 py-3 text-left text-sm leading-6 text-fg transition-colors hover:bg-sunken">
                            {question}
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
} 