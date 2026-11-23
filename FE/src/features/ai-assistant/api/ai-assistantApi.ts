import { api, getApiBaseUrl } from '@/lib/api-client'
import type {
  AssistantAnswer,
  ChatMessage,
  Citation,
  Conversation,
  TransferDraftContext,
} from '../types'

const chatBase = `${getApiBaseUrl().endsWith('/api') ? '/v1' : '/api/v1'}/chat`

interface Envelope<T> {
  success: boolean
  data: T
}

interface ConversationsSummaryDto {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface CitationDto {
  docNumber: string
  docTitle: string
  article: string | null
  clause: string | null
  point: string | null
  text: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
}

interface ChatMessageDto {
  id: string
  conversationId: string
  sender: string
  content: string
  periodStart: string | null
  periodEnd: string | null
  scopeResult: string | null
  answerStatus: string | null
  citations: CitationDto[] | null
  createdAt: string
}

interface SendChatMessageResultDto {
  userMessageDto: ChatMessageDto
  aiMessageDto: ChatMessageDto
}

interface TransferDraftResponseDto {
  conversationId: string
  sourceMessageId: string
  suggestedTitle: string
  periodStart: string | null
  periodEnd: string | null
  citations: CitationDto[]
  initialDataJson: string
}

const formatCitationSource = (c: CitationDto): string => {
  const parts = [
    [c.docNumber, c.docTitle].filter(Boolean).join(' — '),
    c.article,
    c.clause,
    c.point,
  ].filter(Boolean)
  return parts.join(', ')
}

const mapCitation = (c: CitationDto, index: number, prefix: string): Citation => ({
  id: `${prefix}-cite-${index}`,
  source: formatCitationSource(c),
  excerpt: c.text ?? '',
  docNumber: c.docNumber,
  docTitle: c.docTitle,
  article: c.article,
  clause: c.clause,
  point: c.point,
  effectiveFrom: c.effectiveFrom,
  effectiveTo: c.effectiveTo,
})

const mapMessage = (dto: ChatMessageDto): ChatMessage => ({
  id: dto.id,
  role: dto.sender === 'USER' ? 'user' : 'assistant',
  content: dto.content,
  citations: dto.citations
    ? dto.citations.map((c, index) => mapCitation(c, index, dto.id))
    : dto.sender === 'AI'
      ? []
      : undefined,
  periodStart: dto.periodStart,
  periodEnd: dto.periodEnd,
  scopeResult: dto.scopeResult,
  answerStatus: dto.answerStatus,
  createdAt: dto.createdAt,
})

export async function listConversations(
  signal?: AbortSignal
): Promise<Conversation[]> {
  const res = await api.get<Envelope<ConversationsSummaryDto[]>>(
    `${chatBase}/conversations`,
    { signal }
  )
  return (res.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
  }))
}

export async function createConversation(
  title?: string | null
): Promise<Conversation> {
  const res = await api.post<Envelope<ConversationsSummaryDto>>(
    `${chatBase}/conversations`,
    { title: title ?? null }
  )
  return {
    id: res.data.id,
    title: res.data.title,
    updatedAt: res.data.updatedAt,
  }
}

export async function getConversationMessages(
  conversationId: string,
  signal?: AbortSignal
): Promise<ChatMessage[]> {
  const res = await api.get<Envelope<ChatMessageDto[]>>(
    `${chatBase}/conversations/${encodeURIComponent(conversationId)}/messages`,
    { signal }
  )
  return (res.data ?? []).map(mapMessage)
}

export async function sendChatMessage(
  conversationId: string,
  payload: {
    content: string
    periodStart?: string | null
    periodEnd?: string | null
  }
): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
  const res = await api.post<Envelope<SendChatMessageResultDto>>(
    `${chatBase}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      content: payload.content,
      periodStart: payload.periodStart ?? null,
      periodEnd: payload.periodEnd ?? null,
    },
    { timeout: 0 }
  )
  return {
    userMessage: mapMessage(res.data.userMessageDto),
    aiMessage: mapMessage(res.data.aiMessageDto),
  }
}

export async function clarifyChatMessage(
  messageId: string,
  payload: {
    clarificationText: string
    periodStart?: string | null
    periodEnd?: string | null
  }
): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
  const res = await api.post<Envelope<SendChatMessageResultDto>>(
    `${chatBase}/messages/${encodeURIComponent(messageId)}/clarify`,
    {
      clarificationText: payload.clarificationText,
      periodStart: payload.periodStart ?? null,
      periodEnd: payload.periodEnd ?? null,
    },
    { timeout: 0 }
  )
  return {
    userMessage: mapMessage(res.data.userMessageDto),
    aiMessage: mapMessage(res.data.aiMessageDto),
  }
}

export async function transferConversationToDraft(
  conversationId: string,
  messageId?: string | null
): Promise<TransferDraftContext> {
  const res = await api.post<Envelope<TransferDraftResponseDto>>(
    `${chatBase}/conversations/${encodeURIComponent(conversationId)}/transfer-draft`,
    { messageId: messageId ?? null }
  )
  return {
    conversationId: res.data.conversationId,
    sourceMessageId: res.data.sourceMessageId,
    suggestedTitle: res.data.suggestedTitle,
    periodStart: res.data.periodStart,
    periodEnd: res.data.periodEnd,
    citations: res.data.citations.map((c, index) =>
      mapCitation(c, index, res.data.sourceMessageId)
    ),
    initialDataJson: res.data.initialDataJson,
  }
}

/** Development-only demo response when VITE_AI_ASSISTANT_DATA_SOURCE=mock. */
export async function sendQuestionDemo(
  question: string
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
