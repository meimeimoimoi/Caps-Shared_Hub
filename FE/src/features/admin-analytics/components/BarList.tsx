import { cn } from '@/lib/utils'

/* Titled horizontal bar list: label, bar scaled to the largest row, figure */
export function BarList(props: {
  id: string
  title: string
  rows: { key: string; label: string; value: number; display: string; warn?: boolean }[]
  /** Shown when there are no rows (loading or empty) */
  empty: string
}) {
  const max = Math.max(1, ...props.rows.map((r) => r.value))
  return (
    <section className="paper p-5" aria-labelledby={props.id}>
      <h2 id={props.id} className="text-h2">
        {props.title}
      </h2>
      {props.rows.length === 0 && <p className="text-fg-muted mt-3 text-sm">{props.empty}</p>}
      <ul className="mt-3">
        {props.rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 py-2 text-sm">
            <span className={cn('truncate', r.warn && 'text-danger font-semibold')}>{r.label}</span>
            <span className="bg-sunken h-2 overflow-hidden rounded-full">
              <span
                className={cn('motion-bar-x block h-full rounded-full', r.warn ? 'bg-danger' : 'bg-accent')}
                style={{
                  width: `${Math.round((r.value / max) * 100)}%`,
                  animationDelay: `${Math.min(i * 90, 360)}ms`,
                }}
              />
            </span>
            <span className={cn('num text-right', r.warn && 'text-danger font-semibold')}>{r.display}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
