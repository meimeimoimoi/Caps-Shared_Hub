import { useId, useState } from 'react'
import { useMotion } from '@/components/ui/motion'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ShellNotification {
  id: string
  text: string
  to: string
  tone?: 'warning'
}

interface NotificationBellProps {
  notifications: ShellNotification[]
  /** Kích cỡ nút theo header gọi nó */
  className?: string
}

// ponytail: trạng thái đã đọc lưu theo trình duyệt; chuyển sang API khi BE có thông báo thật
const STORAGE_KEY = 'shared-hub-read-notifications'
/** Khóa gồm cả nội dung: số đếm đổi (vd. 1 → 2 khiếu nại) thì thông báo lại thành chưa đọc */
const keyOf = (n: ShellNotification) => `${n.id}:${n.text}`

function loadRead(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/* Chuông + danh sách thông báo. Popover API gốc: tự đóng khi bấm ra ngoài hoặc Esc */
export function NotificationBell({
  notifications,
  className,
}: NotificationBellProps) {
  const id = useId()
  const [read, setRead] = useState(loadRead)
  const unread = notifications.filter((n) => !read.includes(keyOf(n)))

  const markRead = (items: ShellNotification[]) => {
    // Chỉ giữ khóa của thông báo còn tồn tại để localStorage không phình mãi
    const current = new Set(notifications.map(keyOf))
    const next = [...new Set([...read, ...items.map(keyOf)])].filter((k) =>
      current.has(k)
    )
    setRead(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* Bộ nhớ trình duyệt bị chặn: vẫn đánh dấu trong phiên này */
    }
  }

  const [open, setOpen] = useState(false)
  const popupMotion = useMotion({
    preset: 'popover',
    disabled: !open,
    replayKey: open ? 1 : 0,
  })
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Thông báo, ${unread.length} chưa đọc`}
        className={cn(
          'rounded-control text-text-muted hover:bg-surface-muted hover:text-text-strong relative grid size-11 shrink-0 place-items-center',
          className
        )}
      >
        <Bell size={18} aria-hidden="true" />
        {unread.length > 0 && (
          <span className="bg-indicator absolute top-[22%] right-[22%] size-2 rounded-full" />
        )}
      </button>
      <div
        id={id}
        ref={popupMotion}
        onToggle={(event) =>
          setOpen(event.currentTarget.matches(':popover-open'))
        }
        popover="auto"
        className="bg-paper border-hairline rounded-overlay shadow-overlay text-fg fixed inset-auto top-18 right-4 m-0 w-80 max-w-[calc(100vw-32px)] border p-0"
      >
        <div className="border-border-subtle flex items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-fg-strong text-sm font-semibold">Thông báo</p>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() => markRead(notifications)}
              className="text-accent-text text-caption font-semibold underline-offset-4 hover:underline"
            >
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>
        {notifications.length ? (
          <ul className="divide-border-subtle divide-y">
            {notifications.map((n) => {
              const isRead = read.includes(keyOf(n))
              return (
                <li key={n.id}>
                  <Link
                    to={n.to}
                    onClick={() => {
                      markRead([n])
                      document.getElementById(id)?.hidePopover()
                    }}
                    className={cn(
                      'hover:bg-desk-2 flex gap-2 px-4 py-3 text-sm no-underline',
                      isRead ? 'text-fg-muted' : 'text-fg-strong'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        isRead
                          ? 'bg-transparent'
                          : n.tone === 'warning'
                            ? 'bg-warning'
                            : 'bg-indicator'
                      )}
                    />
                    {n.text}
                    {!isRead && <span className="sr-only">, chưa đọc</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-fg-muted px-4 py-6 text-center text-sm">
            Không có thông báo mới.
          </p>
        )}
      </div>
    </>
  )
}
