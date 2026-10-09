import { useState } from "react";
import type { ChatMessage, Conversation } from "../types";
import { sendQuestionDemo } from "../api/ai-assistantApi";

const demoConversations: Conversation[] = [
  { id: '1', title: 'Khấu hao ô tô 4 chỗ' },
  { id: '2', title: 'Chi phí lãi vay' },
  { id: '3', title: 'Chi phí phúc lợi cho nhân viên' },
]

const demoMessages: Record<string, ChatMessage[]> = {
  '1': [
    {
      id: 'demo-1',
      role: 'user',
      content: 'Khấu hao ô tô 4 chỗ',
    },
    {
      id: 'demo-2',
      role: 'assistant',
      content: 'Đây là nội dung minh họa của cuộc tra cứu về khấu hao ô tô[1].',
      citations: [
        {
          id: 'demo-2-cite-1',
          source: 'Văn bản mẫu A (minh họa)',
          excerpt: 'Trích đoạn văn bản pháp luật sẽ hiển thị tại đây.',
        },
      ],
    },
  ],
  '2': [
    {
      id: 'demo-3',
      role: 'user',
      content: 'Chi phí lãi vay',
    },
  ],
  '3': [
    {
      id: 'demo-4',
      role: 'user',
      content: 'Chi phí phúc lợi cho nhân viên',
    },
  ],
}

/** Khóa i18n trong namespace aiAssistant, ví dụ 'errors.sendFailed' */
export type AssistantError = 'errors.sendFailed'

export function useAiAssistant() {
    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState<AssistantError | null>(null)
    const [activeConversationId, setActiveConversationId] =
                                            useState<string | null>(null)
    const [messagesByConversation, setMessagesByConversation] =
                                            useState<Record<string, ChatMessage[]>>(demoMessages)
    const [conversations, setConversations] = useState<Conversation[]>(demoConversations)

    const conversationTitle = messages.find((message) =>
                                message.role === 'user')?.content ?? null

    function handleSelectConversation(id: string) {
        if (isSending) return

        setActiveConversationId(id)
        setMessages(messagesByConversation[id] ?? [])
        setQuestion('')
        setError(null)
    }

    function appendMessage(
        message: ChatMessage,
        conversationId: string,
    ) {
        setMessages((current) => [...current, message])
        setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: [
                ...(current[conversationId] ?? []),
                message,
            ],
        }))
    }

    async function handleSend() {
        const content = question.trim()
        if (!content || isSending) return

        const conversationId = activeConversationId ?? crypto.randomUUID()
        if (!activeConversationId) {
            setConversations((current) => [
                { id: conversationId, title: content },
                ...current,
            ])
            setActiveConversationId(conversationId)
        }

        setError(null)
        setIsSending(true)
        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content }
        appendMessage(userMessage, conversationId)
        setQuestion('')

        try {
            const answer = await sendQuestionDemo(content)
            appendMessage(
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: answer.content,
                    citations: answer.citations,
                },
                conversationId,
            )
        } catch {
            // Gỡ câu hỏi chưa được trả lời và trả về ô nhập để gửi lại mà không bị lặp
            const withoutUnanswered = (list: ChatMessage[]) =>
                list.filter((message) => message.id !== userMessage.id)
            setMessages(withoutUnanswered)
            setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: withoutUnanswered(current[conversationId] ?? []),
            }))
            setQuestion(content)
            setError('errors.sendFailed')
        } finally {
            setIsSending(false)
        }
    }

    function handleNewConversation() {
        if (isSending) return

        setActiveConversationId(null)
        setMessages([])
        setQuestion('')
        setError(null)
    }

    return {
        question,
        setQuestion,
        messages,
        conversationTitle,
        handleSend,
        handleNewConversation,
        isSending,
        error,
        conversations,
        handleSelectConversation,
        activeConversationId,
    }
}
