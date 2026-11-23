import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCaseFormat } from '../ui'

/* Lá riêng tự đếm mỗi giây, để trang không vẽ lại theo đồng hồ.
 * onExpire có thể chạy 2 lần trong StrictMode: người gọi phải idempotent. */
export function Countdown({
  dueAt,
  totalMs,
  urgentMs = 0,
  onExpire,
  className,
}: {
  dueAt: string
  totalMs?: number
  urgentMs?: number
  onExpire?: () => void
  className?: string
}) {
  const { t } = useTranslation('reviewCase')
  const [now, setNow] = useState(Date.now)
  const left = Math.max(0, Date.parse(dueAt) - now)
  const expired = left === 0

  useEffect(() => {
    if (expired) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [expired])
  useEffect(() => {
    if (expired) onExpire?.()
  }, [expired, onExpire])

  const s = Math.floor(left / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const label = expired
    ? t('countdown.expired')
    : s < 3600
      ? t('countdown.ms', { m: pad(Math.floor(s / 60)), s: pad(s % 60) })
      : s < 86_400
        ? t('countdown.hm', {
            h: Math.floor(s / 3600),
            m: Math.floor((s % 3600) / 60),
          })
        : t('countdown.dh', {
            d: Math.floor(s / 86_400),
            h: Math.floor((s % 86_400) / 3600),
          })

  return (
    <>
      <span
        role="timer"
        className={cn('num', left < urgentMs && 'text-danger', className)}
      >
        {label}
      </span>
      {totalMs && (
        <span aria-hidden="true" className="progress mt-3 block">
          <span
            className="progress-fill block"
            style={{ transform: `scaleX(${left / totalMs})` }}
          />
        </span>
      )}
    </>
  )
}

export function Deadline({
  label,
  dueAt,
  onExpire,
}: {
  label: string
  dueAt: string
  onExpire?: () => void
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  return (
    <div className="border-indicator border-l-2 pl-4">
      <p className="eyebrow">{label}</p>
      <p className="text-fg-strong text-h2 mt-1 font-semibold">
        <Countdown dueAt={dueAt} onExpire={onExpire} />{' '}
        <span className="text-fg-muted text-sm font-normal">
          {t('countdown.left')}
        </span>
      </p>
      <p className="text-fg-muted num text-sm">
        {t('countdown.until', { date: f.at(dueAt) })}
      </p>
    </div>
  )
}

export function Initials({
  text,
  color,
  className,
}: {
  text: string
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ background: color }}
      className={cn(
        'text-paper grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold',
        className
      )}
    >
      {text}
    </span>
  )
}

/* Nút chọn tệp theo ngôn ngữ app; input gốc vẫn nhận bàn phím và trình đọc màn hình */
export function FilePicker({
  id,
  hintId,
  onCount,
}: {
  id: string
  hintId: string
  onCount?: (count: number) => void
}) {
  const { t } = useTranslation('reviewCase')
  const [names, setNames] = useState<string[]>([])
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="btn btn-secondary has-[:focus-visible]:outline-ink relative cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
        <Paperclip size={16} aria-hidden="true" />
        {t('files.choose')}
        <input
          id={id}
          type="file"
          multiple
          accept=".pdf,.xls,.xlsx,.csv,image/*"
          aria-describedby={hintId}
          onChange={(e) => {
            const list = Array.from(e.target.files ?? [], (f) => f.name)
            setNames(list)
            onCount?.(list.length)
          }}
          className="sr-only"
        />
      </label>
      <span
        aria-live="polite"
        className="text-fg-muted min-w-0 truncate text-sm"
      >
        {names.length === 0
          ? t('files.none')
          : names.length === 1
            ? names[0]
            : t('files.count', { count: names.length })}
      </span>
    </div>
  )
}
