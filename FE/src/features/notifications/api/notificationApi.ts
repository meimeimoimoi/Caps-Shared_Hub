import { api } from '@/lib/api-client'
import type { NotificationList } from '../types'

const base = '/api/v1/notifications/me'

export async function getMyNotifications(
  signal: AbortSignal
): Promise<NotificationList> {
  const response = await api.get<{ data: NotificationList }>(base, { signal })
  return response.data
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => api.post(`${base}/${id}/read`)))
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post(`${base}/read-all`)
}
