import { cn } from '@/lib/utils'

/* Danh sách thanh ngang có tiêu đề: nhãn, thanh tỷ lệ so với dòng lớn nhất, số */
export function BarList(props: {
  id: string
  title: string
  rows: { key: string; label: string; value: number; display: string; warn?: boolean }[]
  /** Hiện khi không có dòng nào (đang tải hoặc trống) */
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
        {props.rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 py-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="bg-sunken h-2 overflow-hidden rounded-full">
              <span
                className={cn('block h-full rounded-full', r.warn ? 'bg-danger' : 'bg-accent')}
                style={{ width: `${Math.round((r.value / max) * 100)}%` }}
              />
            </span>
            <span className={cn('num text-right', r.warn && 'text-danger font-semibold')}>{r.display}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
