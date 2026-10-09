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
      content: 'Đây là nội dung demo của hội thoại về khấu hao ô tô.',
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

export function userAiAssitant() {
    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isSending, setIsSending] = useState(false)
    const [error, setError] =useState<string | null>(null)
    const [activeConversationId, setActiveConversationId] = 
                                            useState<string | null>(null)
    const [messagesByConversation, setMessagesByConversation] =
                                            useState<Record<string, ChatMessage[]>>(demoMessages)
    const [conversations, setConversations] = useState<Conversation[]>(demoConversations)

    const conversationTitle = messages.find((messages) => 
                                messages.role === 'user')?.content
                                                        || 'Cuộc trò chuyện mới'

    function handleSelectConversation(id: string) {
        if (isSending) return

        setActiveConversationId(id)
        setMessages(messagesByConversation[id] ?? [])
        setQuestion('')
        setError(null)

    }

    function appendMessage(
        message: ChatMessage,
        conversationId: string | null,
    ) {
        setMessages((current) => [...current, message])

        if (conversationId) {
            setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: [
                ...(current[conversationId] ?? []),
                message,
            ],
            }))
        }
    }

    async function handleSend() {
        const content = question.trim()
        let conversationId = activeConversationId

        if (!conversationId) {
        conversationId = crypto.randomUUID()

        const newConversation: Conversation = {
            id: conversationId,
            title: content,
        }

        setConversations((current) => [newConversation, ...current])
        setActiveConversationId(conversationId)
        }

        if (!content || isSending) return
        setError(null)
        setIsSending(true)

        appendMessage(
            {
                id: crypto.randomUUID(),
                role: 'user',
                content,
            },
            conversationId
        )
        setQuestion('')

        try{
            const answer = await sendQuestionDemo(content)
            
            appendMessage(
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: answer,
                },
                conversationId,
            )
        } catch{
            setError('Không thể nhận câu trả lời. Vui lòng thử lại sau.')
        } finally {
            setIsSending(false)
        }
    }

    function handleNewConversation() {
        if(isSending) return

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