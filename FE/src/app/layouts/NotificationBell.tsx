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

/* Chuông + danh sách thông báo. Popover API gốc: tự đóng khi bấm ra ngoài hoặc Esc */
export function NotificationBell({
  notifications,
  className,
}: NotificationBellProps) {
  const id = useId()
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
        aria-label={`Thông báo (${notifications.length})`}
        className={cn(
          'rounded-control relative grid place-items-center',
          className
        )}
      >
        <Bell size={18} aria-hidden="true" />
        {notifications.length > 0 && (
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
        <p className="border-border-subtle text-fg-strong border-b px-4 py-3 text-sm font-semibold">
          Thông báo
        </p>
        {notifications.length ? (
          <ul className="divide-border-subtle divide-y">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.to}
                  onClick={() => document.getElementById(id)?.hidePopover()}
                  className="hover:bg-desk-2 flex gap-2 px-4 py-3 text-sm no-underline"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.tone === 'warning' ? 'bg-warning' : 'bg-indicator'
                    )}
                  />
                  {n.text}
                </Link>
              </li>
            ))}
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
