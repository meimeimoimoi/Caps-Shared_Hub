
export async function sendQuestionDemo(
    question: string,
) : Promise<string> {
    // await new Promise<void>((resolve) => {
    //     setTimeout(resolve, 1000)
    // })
    return `Phản hồi demo: Tôi đã nhận câu hỏi "${question}". Chức năng trả lời AI chưa được kết nối.`
}
