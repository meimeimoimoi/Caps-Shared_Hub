export type Citation = {
    id: string
    /** Tên văn bản và điều khoản, ví dụ "Thông tư 96/2015/TT-BTC, Điều 4" */
    source: string
    excerpt: string
}

export type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    /** Chỉ có ở câu trả lời; mảng rỗng nghĩa là câu trả lời không có căn cứ */
    citations?: Citation[]
}

export type Conversation = {
    id: string
    title: string
}

export type AssistantAnswer = {
    content: string
    citations: Citation[]
}
