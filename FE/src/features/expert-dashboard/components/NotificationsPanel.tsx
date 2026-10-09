import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import type { DashboardDto, DashboardNotification } from '../types'
import { formatRelativeTime } from '../utils/toDashboardViewModel'

const severityConfig: Record<string, { icon: string; className: string }> = {
  urgent: { icon: '🔴', className: 'ep-notif-urgent' },
  warning: { icon: '🟡', className: 'ep-notif-warning' },
  success: { icon: '🟢', className: 'ep-notif-success' },
  info: { icon: '🔵', className: 'ep-notif-info' },
}

export function NotificationsPanel({ notifications }: { notifications: DashboardDto['notifications'] }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (notifications.status !== 'available') return null

  const visibleItems = notifications.data.items.filter((n) => !dismissed.has(n.id))
  const unreadCount = visibleItems.filter((n) => !n.read).length

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id))

  return <div className="ep-notifications-wrapper">
    <button className="ep-notification-bell" onClick={() => setOpen(!open)} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} aria-expanded={open}>
      <Bell size={19} aria-hidden="true" />
      {unreadCount > 0 && <span className="ep-notification-badge" aria-hidden="true">{unreadCount}</span>}
    </button>
    {open && <>
      <div className="ep-notifications-backdrop" onClick={() => setOpen(false)} />
      <div className="ep-notifications-panel" role="region" aria-label="Notifications">
        <div className="ep-notifications-header">
          <h3>Notifications</h3>
          <button className="ep-icon-button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={18} aria-hidden="true" /></button>
        </div>
        {visibleItems.length === 0 ? <div className="ep-notifications-empty"><p>No notifications</p></div>
          : <ul className="ep-notifications-list">{visibleItems.map((item) => <NotificationItem key={item.id} item={item} onDismiss={() => dismiss(item.id)} />)}</ul>}
      </div>
    </>}
  </div>
}

function NotificationItem({ item, onDismiss }: { item: DashboardNotification; onDismiss: () => void }) {
  const config = severityConfig[item.severity] ?? severityConfig.info
  return <li className={`ep-notification-item ${config.className} ${item.read ? 'ep-notif-read' : ''}`}>
    <span className="ep-notif-icon" aria-hidden="true">{config.icon}</span>
    <div className="ep-notif-body">
      <div className="ep-notif-top"><strong>{item.title}</strong><time dateTime={item.timestamp}>{formatRelativeTime(item.timestamp)}</time></div>
      <p>{item.message}</p>
    </div>
    <button className="ep-notif-dismiss" onClick={onDismiss} aria-label={`Dismiss "${item.title}"`}><X size={14} aria-hidden="true" /></button>
  </li>
}
