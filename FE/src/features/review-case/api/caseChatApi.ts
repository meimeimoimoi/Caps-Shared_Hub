import { api } from '@/lib/api-client'
import type { CaseChatMessage, CaseUnread } from '../types'

const base = '/api/v1/review-cases'

/** Without cursors: the newest messages; before: older ones; after: newer ones. Oldest first. */
export async function listCaseMessages(
  caseId: string,
  cursor: { before?: string; after?: string } = {},
  signal?: AbortSignal
): Promise<CaseChatMessage[]> {
  const response = await api.get<{ data: CaseChatMessage[] }>(
    `${base}/${caseId}/messages`,
    { params: cursor, signal }
  )
  return response.data
}

export async function sendCaseMessage(
  caseId: string,
  content: string
): Promise<CaseChatMessage> {
  const response = await api.post<{ data: CaseChatMessage }>(
    `${base}/${caseId}/messages`,
    { content }
  )
  return response.data
}

export async function markCaseMessagesRead(
  caseId: string,
  lastMessageId: string
): Promise<void> {
  await api.post(`${base}/${caseId}/messages/read`, { lastMessageId })
}

export async function getUnreadCaseMessages(
  signal?: AbortSignal
): Promise<CaseUnread[]> {
  const response = await api.get<{ data: CaseUnread[] }>(
    `${base}/messages/unread`,
    { signal }
  )
  return response.data
}
