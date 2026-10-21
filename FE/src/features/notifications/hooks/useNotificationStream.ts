import { useEffect } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useQueryClient, type Query } from '@tanstack/react-query'
import { apiClient, refreshAccessToken } from '@/lib/api-client'
import { getAccessToken } from '@/lib/access-token'
import { useAuthStore } from '@/features/auth'

const HUB_PATH = '/api/v1/notifications/hub'

// Server data a notification can change: the bell itself and the expert pages it links to
const notificationParts = [
  'notifications',
  'expert-application',
  'qualifications',
  'expert-context',
]

// Query key parts each topic of RealtimeChangedEvent refetches (BE: <Service>RealtimeTopics)
const topicParts: Record<string, string[]> = {
  'expert.applications': [
    'queue',
    'expert-application',
    'expert-context',
    'applications',
    'application',
    'experts',
  ],
  'expert.qualifications': [
    'queue',
    'qualifications',
    'qualification',
    'expert-context',
    'experts',
  ],
  'expert.pricing': ['expert-pricing', 'pricing', 'expert-context'],
}

const matching = (parts: string[]) => (query: Query) =>
  query.queryKey.some((part) => parts.includes(part as string))

// A topic this client does not know yet (a newer service) refetches every signed-in query on screen
const forTopic = (topic: unknown) => {
  const parts = typeof topic === 'string' ? topicParts[topic] : undefined
  return parts ? matching(parts) : (query: Query) => query.queryKey[0] === 'private'
}

/**
 * Keeps one SignalR connection per signed-in tab. A pushed notification or data change refetches the
 * affected queries (only those on screen), so pages update without a reload; a reconnect, which may have
 * missed pushes, refetches every signed-in query. Polling in useNotifications stays as the fallback.
 */
export function useNotificationStream() {
  const client = useQueryClient()
  const userId = useAuthStore((s) => (s.token ? s.user?.id : undefined))

  useEffect(() => {
    if (!userId) return
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    const refresh = (predicate: (query: Query) => boolean) => () =>
      client.invalidateQueries({ predicate })
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiClient.defaults.baseURL ?? ''}${HUB_PATH}`, {
        // Called on every (re)connect, so an expired token is renewed through the refresh cookie
        accessTokenFactory: async () =>
          getAccessToken() ?? (await refreshAccessToken().catch(() => '')),
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()
    connection.on('notificationCreated', refresh(matching(notificationParts)))
    connection.on('changed', (change: { topic?: unknown }) =>
      refresh(forTopic(change?.topic))(),
    )
    connection.onreconnected(refresh(forTopic(undefined)))
    const start = async () => {
      try {
        await connection.start()
        if (disposed) return
        failures = 0
        // A change may have arrived before the initial connection was established.
        await refresh(forTopic(undefined))()
      } catch {
        scheduleRetry()
      }
    }
    const scheduleRetry = () => {
      if (disposed || retryTimer !== undefined) return
      const delay = Math.min(1000 * 2 ** Math.min(failures++, 5), 30_000)
      retryTimer = setTimeout(() => {
        retryTimer = undefined
        void start()
      }, delay)
    }
    // Automatic reconnect is finite and does not cover a failed initial start.
    connection.onclose(scheduleRetry)
    void start()
    return () => {
      disposed = true
      if (retryTimer !== undefined) clearTimeout(retryTimer)
      void connection.stop()
    }
  }, [client, userId])
}

/** Mounted once under the QueryClientProvider so every signed-in area (expert, reviewer, admin) listens. */
export function NotificationStream() {
  useNotificationStream()
  return null
}
