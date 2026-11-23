import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeltaTileProps {
  label: string
  value: string
  /** This period / the previous one; up is good (revenue, users) */
  current: number
  previous: number
  /** Comparison text, e.g. "so với 09/2026" */
  versus: string
  /** SIGNED percent (+12% / −8%) so the direction reads in text, not only in color */
  formatPercent: (ratio: number) => string
  /** Shown instead of a percent when the previous period was zero and this one is not */
  newLabel?: string
}

/* Figure compared with the previous period: colored by direction, always with an arrow and percent (never color alone) */
export function DeltaTile({ label, value, current, previous, versus, formatPercent, newLabel }: DeltaTileProps) {
  // Previous period 0 has no percent (division by zero): show a dash, or "first period", never a misleading "0%"
  const ratio = previous ? (current - previous) / previous : null
  const flat = ratio === null || Math.abs(ratio) < 0.005
  const Icon = ratio === null ? null : flat ? Minus : ratio > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="paper p-4">
      <p className="text-fg-muted text-sm">{label}</p>
      {/* The big figure stands alone: proportional digits, not tabular */}
      <p className="text-fg-strong mt-2 text-2xl leading-none font-semibold tracking-tight">{value}</p>
      <p className="text-caption mt-2 flex flex-wrap items-center gap-x-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-semibold',
            flat ? 'text-fg-muted' : ratio > 0 ? 'text-success' : 'text-danger'
          )}
        >
          {Icon && <Icon size={14} aria-hidden="true" />}
          {ratio === null
            ? current > 0 && newLabel
              ? newLabel
              : '—'
            : formatPercent(flat ? 0 : ratio)}
        </span>
        {/* "First period with data" has nothing to compare against, so no "versus" text */}
        {!(ratio === null && current > 0 && newLabel) && (
          <span className="text-fg-muted">{versus}</span>
        )}
      </p>
    </div>
  )
}
