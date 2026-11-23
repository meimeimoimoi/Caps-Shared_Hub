export type Citation = {
  id: string
  /** Document title and legal location, e.g. "96/2015/TT-BTC, Article 4" */
  source: string
  excerpt: string
  docNumber?: string
  docTitle?: string
  article?: string | null
  clause?: string | null
  point?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Present on assistant replies; empty array means no cited sources */
  citations?: Citation[]
  periodStart?: string | null
  periodEnd?: string | null
  scopeResult?: string | null
  answerStatus?:
    | 'ANSWERED'
    | 'NEED_CLARIFICATION'
    | 'REJECTED'
    | string
    | null
  createdAt?: string
}

export type Conversation = {
  id: string
  title: string
  /** ISO timestamp of the latest activity; used for grouping Today / Previous 7 days / Older */
  updatedAt: string
}

export type AssistantAnswer = {
  content: string
  citations: Citation[]
}

export type TransferDraftContext = {
  conversationId: string
  sourceMessageId: string
  suggestedTitle: string
  periodStart: string | null
  periodEnd: string | null
  citations: Citation[]
  initialDataJson: string
}
