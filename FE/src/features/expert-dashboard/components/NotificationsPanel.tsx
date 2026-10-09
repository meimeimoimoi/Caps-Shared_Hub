import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { MotionPresence } from '@/components/ui/motion'
import {
  Bell,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { DashboardDto, DashboardNotification } from '../types'

// Icon cùng màu với viền trái của từng mức; không dùng emoji vì mỗi hệ điều hành vẽ một kiểu
const severityConfig: Record<string, { icon: LucideIcon; className: string }> = {
  urgent: { icon: CircleAlert, className: 'ep-notif-urgent' },
  warning: { icon: TriangleAlert, className: 'ep-notif-warning' },
  success: { icon: CircleCheck, className: 'ep-notif-success' },
  info: { icon: Info, className: 'ep-notif-info' },
}

export function NotificationsPanel({
  notifications,
}: {
  notifications: DashboardDto['notifications']
}) {
  const { t } = useTranslation('expert')

  const [open, setOpen] = useState(false)
  const bell = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    bell.current?.focus()
  }
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (notifications.status !== 'available') return null

  const visibleItems = notifications.data.items.filter(
    (n) => !dismissed.has(n.id)
  )
  const unreadCount = visibleItems.filter((n) => !n.read).length

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id))

  return (
    <div
      className="ep-notifications-wrapper"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          close()
        }
      }}
    >
      <button
        ref={bell}
        className="ep-notification-bell"
        onClick={() => setOpen(!open)}
        aria-label={
          unreadCount > 0
            ? t('notificationsUnread', { total: unreadCount })
            : t('notifications')
        }
        aria-expanded={open}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="ep-notification-badge" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </button>
      {open && <div className="ep-notifications-backdrop" onClick={close} />}
      <MotionPresence
        show={open}
        className="ep-notifications-panel"
        role="region"
        aria-label={t('notifications')}
      >
        <div className="ep-notifications-header">
          <h3>{t('notifications')}</h3>
          <button
            className="ep-icon-button"
            onClick={close}
            aria-label={t('closeNotifications')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {visibleItems.length === 0 ? (
          <div className="ep-notifications-empty">
            <p>{t('noNotifications')}</p>
          </div>
        ) : (
          <ul className="ep-notifications-list">
            {visibleItems.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onDismiss={() => dismiss(item.id)}
              />
            ))}
          </ul>
        )}
      </MotionPresence>
    </div>
  )
}

function NotificationItem({
  item,
  onDismiss,
}: {
  item: DashboardNotification
  onDismiss: () => void
}) {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')
  const config = severityConfig[item.severity] ?? severityConfig.info
  return (
    <li
      className={`ep-notification-item ${config.className} ${item.read ? 'ep-notif-read' : ''}`}
    >
      <config.icon size={16} className="ep-notif-icon" aria-hidden="true" />
      <div className="ep-notif-body">
        <div className="ep-notif-top">
          <strong>{item.title}</strong>
          <time dateTime={item.timestamp}>
            {display.relativeTime(item.timestamp)}
          </time>
        </div>
        <p>{item.message}</p>
      </div>
      <button
        className="ep-notif-dismiss"
        onClick={onDismiss}
        aria-label={t('dismissNotification', { title: item.title })}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  )
}
