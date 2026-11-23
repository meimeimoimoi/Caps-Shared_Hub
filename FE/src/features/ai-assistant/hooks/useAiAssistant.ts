import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  clarifyChatMessage,
  createConversation,
  getConversationMessages,
  listConversations,
  sendChatMessage,
  sendQuestionDemo,
  transferConversationToDraft,
} from '../api/ai-assistantApi'
import { isAiAssistantDemo } from '../api/dataSource'
import { aiAssistantKeys } from '../api/queryKeys'
import type {
  ChatMessage,
  Conversation,
  TransferDraftContext,
} from '../types'

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const demoConversations: Conversation[] = [
  { id: '1', title: 'Khấu hao ô tô 4 chỗ', updatedAt: hoursAgo(1) },
  { id: '2', title: 'Chi phí lãi vay', updatedAt: hoursAgo(30) },
  { id: '3', title: 'Chi phí phúc lợi cho nhân viên', updatedAt: hoursAgo(24 * 12) },
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
      answerStatus: 'ANSWERED',
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

/** i18n keys inside the aiAssistant namespace. */
export type AssistantError =
  | 'errors.sendFailed'
  | 'errors.insufficientCredits'
  | 'errors.transferFailed'

export function useAiAssistant() {
  const location = useLocation()
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.sessionScope)
  const userId = useAuthStore((s) => s.user?.id)
  const scope = `${userId ?? 'anon'}:${session}`

  const initialQuestion: unknown = location.state?.homepageQuestion
  const [question, setQuestion] = useState(
    typeof initialQuestion === 'string' ? initialQuestion.slice(0, 2000) : ''
  )
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  )
  const [error, setError] = useState<AssistantError | null>(null)

  // Demo-only local state when VITE_AI_ASSISTANT_DATA_SOURCE=mock in development.
  const [demoLocalMessages, setDemoLocalMessages] =
    useState<Record<string, ChatMessage[]>>(demoMessages)
  const [demoConversationList, setDemoConversationList] =
    useState<Conversation[]>(demoConversations)
  const [demoSending, setDemoSending] = useState(false)
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<ChatMessage | null>(
    null
  )

  const conversationsQuery = useQuery({
    queryKey: aiAssistantKeys.conversations(scope),
    queryFn: ({ signal }) => listConversations(signal),
    enabled: !isAiAssistantDemo && Boolean(userId),
  })

  const messagesQuery = useQuery({
    queryKey: aiAssistantKeys.messages(scope, activeConversationId ?? ''),
    queryFn: ({ signal }) => getConversationMessages(activeConversationId!, signal),
    enabled: !isAiAssistantDemo && Boolean(activeConversationId),
  })

  const sendMutation = useMutation({
    mutationFn: async (input: {
      content: string
      conversationId: string | null
      clarifyTargetId: string | null
      periodStart: string | null
      periodEnd: string | null
    }) => {
      let targetConversationId = input.conversationId
      if (!targetConversationId) {
        const created = await createConversation(null)
        targetConversationId = created.id
      }

      const result = input.clarifyTargetId
        ? await clarifyChatMessage(input.clarifyTargetId, {
            clarificationText: input.content,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          })
        : await sendChatMessage(targetConversationId, {
            content: input.content,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          })

      return { conversationId: targetConversationId, ...result }
    },
    onSuccess: async (data) => {
      setActiveConversationId(data.conversationId)
      qc.setQueryData<ChatMessage[]>(
        aiAssistantKeys.messages(scope, data.conversationId),
        (prev = []) => [...prev, data.userMessage, data.aiMessage]
      )
      await qc.invalidateQueries({
        queryKey: aiAssistantKeys.conversations(scope),
      })
    },
  })

  const transferMutation = useMutation({
    mutationFn: (input: { conversationId: string; messageId: string }) =>
      transferConversationToDraft(input.conversationId, input.messageId),
  })

  const conversations = isAiAssistantDemo
    ? demoConversationList
    : (conversationsQuery.data ?? [])

  const serverMessages = activeConversationId
    ? isAiAssistantDemo
      ? (demoLocalMessages[activeConversationId] ?? [])
      : (messagesQuery.data ?? [])
    : []

  const messages = optimisticUserMsg
    ? [...serverMessages, optimisticUserMsg]
    : serverMessages

  const isSending = isAiAssistantDemo ? demoSending : sendMutation.isPending

  const conversationTitle =
    conversations.find((c) => c.id === activeConversationId)?.title ??
    messages.find((message) => message.role === 'user')?.content ??
    null

  function handleSelectConversation(id: string) {
    if (isSending) return
    setActiveConversationId(id)
    setQuestion('')
    setError(null)
  }

  function appendDemoMessage(message: ChatMessage, conversationId: string) {
    setDemoLocalMessages((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), message],
    }))
  }

  async function handleSend() {
    const content = question.trim()
    if (!content || isSending) return

    if (isAiAssistantDemo) {
      const conversationId = activeConversationId ?? crypto.randomUUID()
      if (!activeConversationId) {
        setDemoConversationList((current) => [
          { id: conversationId, title: content, updatedAt: new Date().toISOString() },
          ...current,
        ])
        setActiveConversationId(conversationId)
      }

      setError(null)
      setDemoSending(true)
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      }
      appendDemoMessage(userMessage, conversationId)
      setQuestion('')

      try {
        const answer = await sendQuestionDemo(content)
        appendDemoMessage(
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: answer.content,
            answerStatus: 'ANSWERED',
            citations: answer.citations,
          },
          conversationId
        )
      } catch {
        setDemoLocalMessages((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).filter(
            (m) => m.id !== userMessage.id
          ),
        }))
        setQuestion(content)
        setError('errors.sendFailed')
      } finally {
        setDemoSending(false)
      }
      return
    }

    const lastMessage = serverMessages[serverMessages.length - 1]
    const clarifyTarget =
      lastMessage?.role === 'assistant' &&
      lastMessage.answerStatus === 'NEED_CLARIFICATION'
        ? lastMessage
        : null

    const pendingMsg: ChatMessage = {
      id: `pending-${crypto.randomUUID()}`,
      role: 'user',
      content,
    }
    setError(null)
    setQuestion('')
    setOptimisticUserMsg(pendingMsg)

    try {
      await sendMutation.mutateAsync({
        content,
        conversationId: activeConversationId,
        clarifyTargetId: clarifyTarget?.id ?? null,
        periodStart: clarifyTarget?.periodStart ?? null,
        periodEnd: clarifyTarget?.periodEnd ?? null,
      })
      setOptimisticUserMsg(null)
    } catch (e: unknown) {
      setOptimisticUserMsg(null)
      setQuestion(content)
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_CREDITS') {
        setError('errors.insufficientCredits')
      } else {
        setError('errors.sendFailed')
      }
    }
  }

  function handleNewConversation() {
    if (isSending) return
    setActiveConversationId(null)
    setOptimisticUserMsg(null)
    setQuestion('')
    setError(null)
  }

  async function handleTransferDraft(
    messageId: string
  ): Promise<TransferDraftContext | null> {
    if (isAiAssistantDemo || !activeConversationId) return null
    return transferMutation.mutateAsync({
      conversationId: activeConversationId,
      messageId,
    })
  }

  return {
    question,
    setQuestion,
    messages,
    conversationTitle,
    handleSend,
    handleNewConversation,
    isSending,
    isTransferring: transferMutation.isPending,
    handleTransferDraft,
    error,
    conversations,
    handleSelectConversation,
    activeConversationId,
  }
}
