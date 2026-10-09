import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { staggerDelay } from '@/components/ui/motion/tokens'

export interface ChartSeries {
  name: string
  /** CSS color, dùng token --ui-series-N (đã validate) */
  color: string
}

interface StackedColumnChartProps {
  title: string
  series: ChartSeries[]
  /** Mỗi cột: nhãn đầy đủ (tooltip, bảng), nhãn ngắn cho trục X, giá trị theo đúng thứ tự series */
  columns: { label: string; tick: string; values: number[] }[]
  /** Định dạng số cho trục, tooltip và bảng */
  format: (value: number) => string
  /** Đang tải lại: giữ hình cũ, làm mờ */
  stale?: boolean
  tableLabel: string
  periodLabel: string
  totalLabel: string
}

/** Trục Y tròn số: 4 vạch theo bước 1/2/5 × 10^n */
function niceTicks(max: number) {
  if (max <= 0) return [0]
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

const PLOT_H = 180

/* Cột chồng nhiều series. Mỗi cột là một nút: rê chuột hoặc Tab để xem tooltip;
 * bảng số trong <details> để giá trị không chỉ nằm trong tooltip. */
export function StackedColumnChart({
  title,
  series,
  columns,
  format,
  stale,
  tableLabel,
  periodLabel,
  totalLabel,
}: StackedColumnChartProps) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const totals = columns.map((c) => c.values.reduce((s, v) => s + v, 0))
  const ticks = niceTicks(Math.max(...totals, 0))
  const top = ticks[ticks.length - 1] || 1

  return (
    <figure
      className={cn('transition-opacity', stale && 'opacity-60')}
      aria-labelledby={`${id}-title`}
    >
      <figcaption
        id={`${id}-title`}
        className="text-fg-strong text-sm font-semibold"
      >
        {title}
      </figcaption>
      {/* Legend luôn có khi >= 2 series: nhận diện không chỉ dựa vào màu */}
      <ul className="text-fg-muted text-caption mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.name}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        {/* Trục Y: số tròn, căn phải, tabular để thẳng hàng */}
        <div
          className="relative w-16 shrink-0"
          style={{ height: PLOT_H }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="text-fg-muted num text-caption absolute right-0 tabular-nums"
              // Căn giữa nhãn theo đường lưới cùng giá trị
              style={{
                bottom: `${(tick / top) * 100}%`,
                transform: 'translateY(50%)',
              }}
            >
              {format(tick)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_H }}>
            {/* Lưới: hairline liền, lệch một bậc so với nền */}
            {ticks.map((tick) => (
              <span
                key={tick}
                aria-hidden="true"
                className="bg-border-subtle absolute inset-x-0 h-px"
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {columns.map((col, i) => (
                <button
                  key={col.label}
                  type="button"
                  // Vùng bấm cả dải cột, rộng hơn thân cột
                  className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-offset-2"
                  aria-label={`${col.label}: ${series.map((s, k) => `${s.name} ${format(col.values[k])}`).join(', ')}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  {/* Cột: series đầu ở đáy; khe 2px giữa các phần; bo 4px ở đầu cột, đáy vuông */}
                  <span
                    className={cn(
                      'motion-bar flex w-full max-w-6 flex-col-reverse gap-0.5 overflow-hidden rounded-t transition-opacity',
                      active !== null && active !== i && 'opacity-50'
                    )}
                    // Lệch nhịp từ trái sang, tối đa theo token stagger để 12 cột không chờ quá lâu
                    style={{
                      height: `${(totals[i] / top) * 100}%`,
                      animationDelay: `${staggerDelay(i, 30)}ms`,
                    }}
                  >
                    {col.values.map((v, k) =>
                      v > 0 ? (
                        <span
                          key={series[k].name}
                          className="block w-full shrink-0"
                          style={{
                            flexGrow: v,
                            flexBasis: 0,
                            background: series[k].color,
                          }}
                        />
                      ) : null
                    )}
                  </span>
                  {active === i && (
                    <span
                      role="tooltip"
                      className="bg-paper border-hairline shadow-overlay text-fg text-caption pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-56 rounded-lg border px-3 py-2 text-left"
                    >
                      <span className="text-fg-muted block">{col.label}</span>
                      {series.map((s, k) => (
                        <span
                          key={s.name}
                          className="mt-1 flex items-center gap-2"
                        >
                          {/* Line key, không phải ô màu */}
                          <span
                            aria-hidden="true"
                            className="h-0.5 w-3 rounded-full"
                            style={{ background: s.color }}
                          />
                          <span className="text-fg-strong num font-semibold">
                            {format(col.values[k])}
                          </span>
                          <span className="text-fg-muted">{s.name}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {/* Trục X */}
          <div className="mt-2 flex" aria-hidden="true">
            {columns.map((col) => (
              <span
                key={col.label}
                className="text-fg-muted num text-caption flex-1 truncate text-center"
              >
                {col.tick}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng số: bản tương đương cho trình đọc màn hình và khi cần số chính xác */}
      <details className="motion-details mt-3 text-sm">
        <summary className="text-fg-muted text-caption cursor-pointer">
          {tableLabel}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="text-caption w-full">
            <thead className="text-fg-muted">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-semibold">
                <th className="text-left">{periodLabel}</th>
                {series.map((s) => (
                  <th key={s.name} className="text-right">
                    {s.name}
                  </th>
                ))}
                <th className="text-right">{totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => (
                <tr
                  key={col.label}
                  className="border-border-subtle border-t [&>td]:px-2 [&>td]:py-1.5"
                >
                  <td>{col.label}</td>
                  {col.values.map((v, k) => (
                    <td
                      key={series[k].name}
                      className="num text-right tabular-nums"
                    >
                      {format(v)}
                    </td>
                  ))}
                  <td className="text-fg-strong num text-right font-semibold tabular-nums">
                    {format(totals[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
