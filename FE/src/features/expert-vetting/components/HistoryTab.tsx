import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { HistoryEntry } from '../types'
import { formatDateTime } from '../utils/applications'

/** Newest first, as a timeline. `panel` drops the card and heading when it already sits in a tab panel. */
export function HistoryTab({
  history,
  title,
  variant = 'card',
}: {
  history: HistoryEntry[]
  title?: string
  variant?: 'card' | 'panel'
}) {
  const { t } = useTranslation('admin')
  const timeline = history.length ? (
    <ol className="relative">
      {history.map((h, i) => (
        <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
          {/* Connector to the next entry */}
          {i < history.length - 1 && <span aria-hidden="true" className="bg-border absolute top-4 bottom-0 left-[5px] w-px" />}
          <span aria-hidden="true" className={cn('relative mt-1.5 size-[11px] shrink-0 rounded-full border-2', i === 0 ? 'border-text-strong bg-text-strong' : 'border-border-strong bg-surface')} />
          <div className="min-w-0 flex-1">
            <p className="text-text-strong text-sm leading-6 font-medium break-words">{h.text}</p>
            <p className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
              {h.actor === 'AI' ? <span className="badge-ai">AI</span> : <span>{h.actor || t('detail.history.reviewer')}</span>}
              <span aria-hidden="true">·</span>
              <time dateTime={h.at} className="tabular-nums">{formatDateTime(h.at)}</time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-text-muted text-sm">—</p>
  )

  if (variant === 'panel') return timeline
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{title ?? t('detail.history.title')}</h2>
      <div className="mt-4">{timeline}</div>
    </section>
  )
}
