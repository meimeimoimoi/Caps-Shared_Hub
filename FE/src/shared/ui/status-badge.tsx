import { TriangleAlert } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { StatusMeta, Tone } from '@/shared/lib/constants'

const toneClass: Record<Exclude<Tone, 'plain'>, string> = {
  neutral: 'bg-sunken text-fg border-border',
  accent: 'bg-accent-soft text-accent-text border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
}

/* SHFT §6: tone `plain` = trạng thái bình thường → chữ xám, KHÔNG badge */
export function StatusBadge({ status }: { status: StatusMeta }) {
  if (status.tone === 'plain')
    return <span className="text-fg-muted">{status.label}</span>

  return (
    <span
      className={cn(
        'rounded-surface inline-flex items-center gap-1.5 border px-2 py-0.5 text-sm whitespace-nowrap',
        toneClass[status.tone]
      )}
    >
      {status.tone === 'warning' ? (
        <TriangleAlert size={13} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {status.label}
    </span>
  )
}
