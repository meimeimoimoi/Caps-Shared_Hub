import { cn, formatDayMonth } from '@/lib/utils'
import { RAIL_DOCUMENT } from '@/lib/constants'

const time = (iso: string) =>
  `${formatDayMonth(iso)} ${new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`

/* Thanh 5 bước kèm thời điểm xong từng bước; null = chưa tới bước đó */
export function DocumentTimeline({ timeline }: { timeline: (string | null)[] }) {
  const current = timeline.findIndex((at) => !at)
  return (
    <ol aria-label="Tiến trình xử lý" className="flex overflow-x-auto pb-1">
      {RAIL_DOCUMENT.map((label, i) => {
        const at = timeline[i]
        return (
          <li
            key={label}
            aria-current={i === current ? 'step' : undefined}
            className="relative min-w-32 flex-1"
          >
            {i < RAIL_DOCUMENT.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'rail-track absolute top-0 left-4 w-[calc(100%-24px)]',
                  timeline[i + 1] && 'rail-track-done'
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'rail-dot relative block',
                at && 'rail-dot-done',
                i === current && 'rail-dot-current'
              )}
            />
            <p className={cn('mt-2 text-sm', at ? 'text-fg-strong' : 'text-fg-muted')}>
              {label}
            </p>
            <p className="text-fg-muted num text-caption">{at ? time(at) : 'Chưa tới'}</p>
          </li>
        )
      })}
    </ol>
  )
}
