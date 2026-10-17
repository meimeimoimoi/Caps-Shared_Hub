/** One in-app notification as the notification service returns it. */
export interface AppNotification {
  id: string
  type: string
  data: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export interface NotificationList {
  items: AppNotification[]
  unreadCount: number
}
