export type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
}

export type Conversation = {
    id: string
    title: string
}