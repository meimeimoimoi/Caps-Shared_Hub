import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDayMonth } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import {
  getDocuments,
  getPipelineSummary,
} from '../../features/knowledgeAdmin-review-approval/api/knowledgeApi'
import { knowledgeKeys } from '../../features/knowledgeAdmin-review-approval/api/queryKeys'
import { useCollection } from '../../features/knowledgeAdmin-sources/hooks/useCollection'
import { RUN_TRIGGER } from '../../features/knowledgeAdmin-sources/constants'
import { REVIEW_SLA_DAYS } from '../../features/knowledgeAdmin-review-approval/constants'
import { KnowledgeGrowth } from '../../features/knowledgeAdmin-analytics/components/KnowledgeGrowth'
import { useKnowledgeStats } from '../../features/knowledgeAdmin-analytics/hooks/useKnowledgeStats'
import { BarList } from '../../features/admin-analytics/components/BarList'
import { KpiCard } from '../../features/admin-analytics/components/KpiCard'

/* Tổng quan Knowledge Admin: chỉ số, tăng trưởng kho, chỗ đang tắc. Việc gấp nằm ở chuông thông báo (useKnowledgeNav).
 * Dùng chung cache với các màn chi tiết */
export default function KnowledgeDashboardPage() {
  const nav = useKnowledgeNav()
  const f = useFormatters()
  const [now] = useState(() => Date.now())
  const summary = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  const review = useQuery({
    queryKey: knowledgeKeys.documents('review'),
    queryFn: ({ signal }) => getDocuments('review', signal),
  })
  const collection = useCollection()
  const stats = useKnowledgeStats()

  const s = summary.data
  const failed = s ? s.indexFailed + s.parseFailed : 0
  const waited = (iso: string) =>
    Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  const pendingDocs = review.data ?? []
  const oldestDays = pendingDocs.length
    ? Math.max(...pendingDocs.map((d) => waited(d.queuedAt)))
    : null
  const schedule = collection.data?.schedule
  const runs = collection.data?.runs.slice(0, 3) ?? []

  return (
    <KnowledgeLayout {...nav} section="overview" breadcrumb="Tổng quan">
      <h1 className="text-h1">Tổng quan</h1>
      <p className="text-fg-muted mt-3">
        Tình trạng kho tri thức. Việc cần xử lý nằm ở chuông thông báo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Chờ rà soát"
          value={s?.pending}
          note={
            !review.data
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
            s ? `${s.indexing} đang index · ${s.parsing} đang bóc tách` : ''
          }
          to="/knowledge/documents"
        />
        <KpiCard
          label="Thu thập tháng này"
          value={s?.collectedThisMonth}
          note={
            schedule
              ? `Lần chạy tới: ${formatDayMonth(schedule.nextRunAt)}`
              : ''
          }
          to="/knowledge/sources"
        />
      </div>

      <section className="mt-10" aria-labelledby="kn-growth">
        <h2 id="kn-growth" className="text-h2">
          Tăng trưởng kho
        </h2>
        {stats.data ? (
          <KnowledgeGrowth months={stats.data.months} />
        ) : stats.isLoading ? (
          // Khung xương đúng bố cục: 3 ô so sánh + 2 biểu đồ, để trang không giật khi dữ liệu về
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

      {/* Chỗ đang tắc và cơ cấu kho */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Chờ lâu mới là vấn đề, không phải số lượng chờ: chia theo số ngày đã chờ, nhóm quá hạn tô đỏ */}
        <BarList
          id="kn-waiting"
          title="Văn bản chờ rà soát theo thời gian chờ"
          empty={
            review.isLoading ? 'Đang tải…' : 'Không có văn bản chờ rà soát.'
          }
          rows={(pendingDocs.length
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
            const value = pendingDocs.filter(
              (d) => waited(d.queuedAt) >= min && waited(d.queuedAt) <= max
            ).length
            return { ...row, value, display: f.number(value) }
          })}
        />
        <BarList
          id="kn-doctype"
          title="Kho theo loại văn bản"
          empty={stats.isLoading ? 'Đang tải…' : 'Chưa có số liệu.'}
          rows={(stats.data?.byDocType ?? []).map((d) => ({
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
              <li key={r.at} className="flex flex-wrap gap-x-4 gap-y-1 py-2.5">
                <span className="text-fg-muted num w-14 shrink-0">
                  {formatDayMonth(r.at)}
                </span>
                <span className="text-fg-muted w-20 shrink-0">
                  {RUN_TRIGGER[r.trigger]}
                </span>
                <span className="text-fg-strong">
                  {r.newDocs} văn bản mới · {r.newVersions} phiên bản mới ·{' '}
                  {r.unchanged} không đổi
                </span>
                {r.errors > 0 && (
                  <span className="text-danger font-semibold">
                    {r.errors} lỗi
                  </span>
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
