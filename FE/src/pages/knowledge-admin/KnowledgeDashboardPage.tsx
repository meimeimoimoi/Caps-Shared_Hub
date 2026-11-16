import { Link } from 'react-router-dom'
import { formatDayMonth } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { RUN_TRIGGER } from '../../features/knowledgeAdmin-sources/constants'
import { REVIEW_SLA_DAYS } from '../../features/knowledgeAdmin-review-approval/constants'
import { KnowledgeGrowth } from '../../features/knowledgeAdmin-analytics/components/KnowledgeGrowth'
import { useKnowledgeStats } from '../../features/knowledgeAdmin-analytics/hooks/useKnowledgeStats'
import { BarList } from '../../features/admin-analytics/components/BarList'
import { KpiCard } from '../../features/admin-analytics/components/KpiCard'

/* Knowledge Admin overview: key figures, growth of the base, where work is stuck. Urgent items live in the
 * notification bell (useKnowledgeNav), which reads the same cached statistics. */
export default function KnowledgeDashboardPage() {
  const nav = useKnowledgeNav()
  const f = useFormatters()
  const stats = useKnowledgeStats()

  const data = stats.data
  const s = data?.pipeline
  const failed = s ? s.indexFailed + s.parseFailed : 0
  const ages = data?.pendingAges ?? []
  const oldestDays = ages.length ? Math.max(...ages.map((a) => a.days)) : null
  const thisMonth = data?.months.at(-1)
  const lastClosed = data?.months.filter((p) => !p.partial).at(-1)
  const runs = data?.recentRuns ?? []
  const lastRun = runs[0]
  const waiting = (min: number, max: number) =>
    ages.filter((a) => a.days >= min && a.days <= max).reduce((sum, a) => sum + a.count, 0)

  return (
    <KnowledgeLayout {...nav} section="overview" breadcrumb="Tổng quan">
      <div className="flex items-center gap-2">
        <h1 className="text-h1">Tổng quan</h1>
        <HelpTip label="Về trang Tổng quan">
          Tình trạng kho tri thức. Việc cần xử lý nằm ở chuông thông báo.
        </HelpTip>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Chờ rà soát"
          value={s?.awaitingReview}
          note={
            !data
              ? ''
              : oldestDays !== null
                ? `Lâu nhất ${oldestDays} ngày`
                : 'Không có văn bản chờ'
          }
          to="/knowledge/queue?stage=review"
        />
        <KpiCard
          label="Đang lỗi"
          value={s && failed}
          note={
            s
              ? `${s.indexFailed} lỗi index · ${s.parseFailed} lỗi bóc tách`
              : ''
          }
          warn={failed > 0}
          to="/knowledge/queue?stage=failed"
        />
        <KpiCard
          label="Đã index"
          value={s?.indexed}
          note={
            s ? `${s.approved} chờ index · ${s.awaitingContent} đang bóc tách` : ''
          }
          to="/knowledge/documents"
        />
        <KpiCard
          label="Thu thập tháng này"
          value={thisMonth && thisMonth.crawled + thisMonth.uploaded}
          note={
            !data
              ? ''
              : lastRun
                ? `Lần chạy gần nhất: ${formatDayMonth(lastRun.startedAt)}`
                : 'Chưa chạy lần nào'
          }
          to="/knowledge/sources"
        />
      </div>

      <section className="mt-10" aria-labelledby="kn-growth">
        <div className="flex items-center gap-2">
          <h2 id="kn-growth" className="text-h2">
            Tăng trưởng kho
          </h2>
          <HelpTip label="Về Tăng trưởng kho">
            {lastClosed
              ? `Tháng đã chốt gần nhất: ${f.dateOnly(lastClosed.start, { month: 'numeric', year: 'numeric' })}. `
              : ''}
            Tháng đang diễn ra chỉ hiện trên biểu đồ.
          </HelpTip>
        </div>
        {data ? (
          <KnowledgeGrowth months={data.months} />
        ) : stats.isLoading ? (
          // Skeleton in the final layout: 3 comparison tiles + 2 charts, so the page does not jump
          <div role="status" className="mt-4">
            <span className="sr-only">Đang tải số liệu…</span>
            <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="paper h-28 motion-safe:animate-pulse" />
              ))}
            </div>
            <div aria-hidden="true" className="mt-4 grid gap-4 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="paper h-80 motion-safe:animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <p className="paper text-fg-muted mt-4 px-5 py-8 text-sm">
            {stats.error?.message ?? 'Không tải được số liệu.'}
          </p>
        )}
      </section>

      {/* Where work is stuck, and what the base is made of */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Waiting long is the problem, not how many wait: grouped by days waited, overdue group in red */}
        <BarList
          id="kn-waiting"
          title="Văn bản chờ rà soát theo thời gian chờ"
          empty={stats.isLoading ? 'Đang tải…' : 'Không có văn bản chờ rà soát.'}
          rows={(ages.length
            ? [
                { key: 'fresh', label: 'Dưới 3 ngày', min: 0, max: 2 },
                {
                  key: 'soon',
                  label: `3–${REVIEW_SLA_DAYS} ngày`,
                  min: 3,
                  max: REVIEW_SLA_DAYS,
                },
                {
                  key: 'late',
                  label: `Quá ${REVIEW_SLA_DAYS} ngày`,
                  min: REVIEW_SLA_DAYS + 1,
                  max: Infinity,
                  warn: true,
                },
              ]
            : []
          ).map(({ min, max, ...row }) => {
            const value = waiting(min, max)
            return { ...row, value, display: f.number(value) }
          })}
        />
        <BarList
          id="kn-doctype"
          title="Kho theo loại văn bản"
          empty={stats.isLoading ? 'Đang tải…' : 'Chưa có số liệu.'}
          rows={(data?.byDocType ?? []).map((d) => ({
            key: d.docType,
            label: d.docType,
            value: d.count,
            display: f.number(d.count),
          }))}
        />
      </div>

      <section className="paper mt-6 p-5" aria-labelledby="kn-runs">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="kn-runs" className="text-h2">
            Lần thu thập gần đây
          </h2>
          <Link
            to="/knowledge/sources"
            className="text-accent-text text-sm underline underline-offset-4"
          >
            Nguồn thu thập
          </Link>
        </div>
        {runs.length ? (
          <ul className="divide-border-subtle mt-3 divide-y text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-4 gap-y-1 py-2.5">
                <span className="text-fg-muted num w-14 shrink-0">
                  {formatDayMonth(r.startedAt)}
                </span>
                <span className="text-fg-muted w-20 shrink-0">
                  {RUN_TRIGGER[r.triggerType as keyof typeof RUN_TRIGGER] ?? r.triggerType}
                </span>
                {r.status === 'RUNNING' ? (
                  <span className="text-fg-strong">Đang chạy</span>
                ) : (
                  <span className="text-fg-strong">
                    {r.documentsFound} văn bản tìm thấy · {r.newDocuments} văn bản mới ·{' '}
                    {r.newVersions} phiên bản mới
                  </span>
                )}
                {r.status === 'FAILED' && (
                  <span className="text-danger font-semibold">Lỗi</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted mt-3 text-sm">
            Chưa có lần thu thập nào.
          </p>
        )}
      </section>
    </KnowledgeLayout>
  )
}
