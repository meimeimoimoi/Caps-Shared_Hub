import { useFormatters } from '@/hooks/useFormatters'
import { DeltaTile } from '@/features/admin-analytics/components/DeltaTile'
import { StackedColumnChart } from '@/features/admin-analytics/components/StackedColumnChart'
import type { KnowledgeStatPeriod } from '../types'

const TABLE = { tableLabel: 'Xem dạng bảng', periodLabel: 'Tháng', totalLabel: 'Tổng' }

/* Tăng trưởng kho: tháng đã chốt gần nhất so với tháng trước, và 12 tháng theo nguồn / theo loại thay đổi */
export function KnowledgeGrowth({ months }: { months: KnowledgeStatPeriod[] }) {
  const f = useFormatters()
  const label = (p: KnowledgeStatPeriod) =>
    f.dateOnly(p.start, { month: 'numeric', year: 'numeric' }) + (p.partial ? ' (đến nay)' : '')
  // Trục X hẹp (12 cột): chỉ hiện tháng; năm có trong tooltip và bảng
  const tick = (p: KnowledgeStatPeriod) => `T${f.dateOnly(p.start, { month: 'numeric' })}`
  // So kỳ dở với kỳ đủ sẽ luôn báo giảm sai, nên chỉ so 2 tháng đã chốt
  const closed = months.filter((p) => !p.partial)
  const cur = closed.at(-1)
  const prev = closed.at(-2)
  if (!cur || !prev) return <p className="paper text-fg-muted mt-4 px-5 py-8 text-sm">Chưa đủ 2 tháng đã chốt để so sánh.</p>

  const versus = `so với ${f.dateOnly(prev.start, { month: 'numeric', year: 'numeric' })}`
  const percent = (ratio: number) =>
    f.number(ratio, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 })
  const collected = (p: KnowledgeStatPeriod) => p.crawled + p.uploaded

  return (
    <>
      <p className="text-fg-muted mt-1 text-sm">
        Tháng đã chốt gần nhất: {f.dateOnly(cur.start, { month: 'numeric', year: 'numeric' })}. Tháng đang diễn ra chỉ
        hiện trên biểu đồ.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Văn bản thu thập', get: collected },
          { label: 'Văn bản mới vào kho', get: (p: KnowledgeStatPeriod) => p.newDocs },
          { label: 'Phiên bản cập nhật', get: (p: KnowledgeStatPeriod) => p.newVersions },
        ].map((tile) => (
          <DeltaTile
            key={tile.label}
            label={tile.label}
            value={f.number(tile.get(cur))}
            current={tile.get(cur)}
            previous={tile.get(prev)}
            versus={versus}
            formatPercent={percent}
          />
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="paper p-5">
          <StackedColumnChart
            title="Văn bản thu thập theo nguồn"
            series={[
              { name: 'Crawl tự động', color: 'var(--ui-series-1)' },
              { name: 'Tải lên thủ công', color: 'var(--ui-series-2)' },
            ]}
            columns={months.map((p) => ({ label: label(p), tick: tick(p), values: [p.crawled, p.uploaded] }))}
            format={(v) => f.number(v)}
            {...TABLE}
          />
        </div>
        <div className="paper p-5">
          <StackedColumnChart
            title="Văn bản được duyệt vào kho"
            series={[
              { name: 'Văn bản mới', color: 'var(--ui-series-1)' },
              { name: 'Phiên bản mới', color: 'var(--ui-series-2)' },
            ]}
            columns={months.map((p) => ({ label: label(p), tick: tick(p), values: [p.newDocs, p.newVersions] }))}
            format={(v) => f.number(v)}
            {...TABLE}
          />
        </div>
      </div>
      <p className="text-fg-muted text-caption mt-2">Số liệu minh họa, chờ API thống kê của BE.</p>
    </>
  )
}
