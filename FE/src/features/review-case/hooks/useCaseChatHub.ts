import { useEffect } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { getAccessToken } from '@/lib/access-token'
import { getApiBaseUrl, refreshAccessToken } from '@/lib/api-client'
import type { CaseChatMessage } from '../types'
import { appendMessage, caseMessagesKey, caseUnreadKey } from './useCaseChat'

const hubPath = '/api/v1/review-cases/hubs/chat'

type CaseMessageCreated = { reviewCaseId: string; message: CaseChatMessage }

/**
 * Live case chat: new messages are pushed into the React Query cache. Mount once in a signed-in
 * layout; one connection serves every case the user takes part in.
 */
export function useCaseChatHub() {
  const client = useQueryClient()
  // Reconnect on sign-in/out only, not on every token refresh
  const signedIn = useAuthStore((s) => Boolean(s.token))

  useEffect(() => {
    if (!signedIn) return
    const connection = new HubConnectionBuilder()
      .withUrl(`${getApiBaseUrl()}${hubPath}`, {
        accessTokenFactory: () => getAccessToken() ?? refreshAccessToken(),
      })
      .withAutomaticReconnect()
      .build()
    connection.on(
      'CaseMessageCreated',
      ({ reviewCaseId, message }: CaseMessageCreated) => {
        client.setQueryData<CaseChatMessage[]>(
          caseMessagesKey(reviewCaseId),
          (old) => appendMessage(old, message)
        )
        void client.invalidateQueries({ queryKey: caseUnreadKey })
      }
    )
    // Messages pushed while the connection was down are fetched again
    connection.onreconnected(() => {
      void client.invalidateQueries({ queryKey: ['private', 'case-messages'] })
      void client.invalidateQueries({ queryKey: caseUnreadKey })
    })
    connection.start().catch((error: unknown) => {
      // The chat still loads over REST; it only stops updating live
      console.warn('Case chat hub unavailable', error)
    })
    return () => void connection.stop()
  }, [client, signedIn])
}
