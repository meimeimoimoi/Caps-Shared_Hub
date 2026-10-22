import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUnreadCaseMessages,
  listCaseMessages,
  markCaseMessagesRead,
  sendCaseMessage,
} from '../api/caseChatApi'
import type { CaseChatMessage } from '../types'

export const caseMessagesKey = (caseId: string) =>
  ['private', 'case-messages', caseId] as const
export const caseUnreadKey = ['private', 'case-unread'] as const

/** Adds a message once: the hub and the send response both deliver the sender's own message. */
export const appendMessage = (
  old: CaseChatMessage[] | undefined,
  message: CaseChatMessage
) => (old && !old.some((m) => m.id === message.id) ? [...old, message] : old)

/** Messages of one case (kept current by useCaseChatHub), sending and marking as read. */
export function useCaseChat(caseId: string) {
  const client = useQueryClient()
  const key = caseMessagesKey(caseId)
  const messages = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listCaseMessages(caseId, {}, signal),
    enabled: Boolean(caseId),
  })
  const send = useMutation({
    mutationFn: (content: string) => sendCaseMessage(caseId, content),
    onSuccess: (message) =>
      client.setQueryData<CaseChatMessage[]>(key, (old) =>
        appendMessage(old, message)
      ),
  })
  const markRead = useMutation({
    mutationFn: (lastMessageId: string) =>
      markCaseMessagesRead(caseId, lastMessageId),
    onSettled: () => client.invalidateQueries({ queryKey: caseUnreadKey }),
  })
  return { messages, send, markRead }
}

/** Unread counts per case the signed-in user takes part in. */
export function useCaseUnread() {
  return useQuery({
    queryKey: caseUnreadKey,
    queryFn: ({ signal }) => getUnreadCaseMessages(signal),
  })
}
