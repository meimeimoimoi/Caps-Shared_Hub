import { useEffect, useState } from 'react'
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
import { KnowledgeGrowth } from '../../features/knowledgeAdmin-analytics/components/KnowledgeGrowth'
import { useKnowledgeStats } from '../../features/knowledgeAdmin-analytics/hooks/useKnowledgeStats'
import {
  AttentionList,
  type AttentionItem,
} from '../../features/admin-analytics/components/AttentionList'
import { BarList } from '../../features/admin-analytics/components/BarList'
import { KpiCard } from '../../features/admin-analytics/components/KpiCard'

// ponytail: ngưỡng chờ rà soát do FE tạm đặt; đổi khi nhóm chốt SLA duyệt văn bản
const REVIEW_SLA_DAYS = 7

/* Tổng quan Knowledge Admin: việc gấp, chỉ số, tăng trưởng kho, chỗ đang tắc. Dùng chung cache với các màn chi tiết */
export default function KnowledgeDashboardPage() {
  const nav = useKnowledgeNav()
  const f = useFormatters()
  const [now] = useState(() => Date.now())
  useEffect(() => {
    document.title = 'Tổng quan | Shared Hub'
  }, [])

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
  const loading = summary.isLoading || review.isLoading || collection.isLoading

  const s = summary.data
  // Chưa có dữ liệu thì hiện "…", tránh thoáng hiện 0 như thể kho đang ổn
  const num = (v: number | undefined) => (v === undefined ? '…' : f.number(v))
  const failed = s ? s.indexFailed + s.parseFailed : 0
  const waited = (iso: string) =>
    Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  const pendingDocs = review.data ?? []
  const oldestDays = pendingDocs.length
    ? Math.max(...pendingDocs.map((d) => waited(d.queuedAt)))
    : null
  const overdue = pendingDocs.filter(
    (d) => waited(d.queuedAt) > REVIEW_SLA_DAYS
  ).length
  const withWarnings = pendingDocs.filter((d) => d.parseWarnings > 0).length
  const schedule = collection.data?.schedule
  const runs = collection.data?.runs.slice(0, 3) ?? []

  // Việc gấp: lỗi làm kho thiếu văn bản trước, chờ lâu sau, cảnh báo nhẹ cuối
  const attention = [
    failed > 0 && {
      text: `${failed} văn bản lỗi bóc tách hoặc index, cần thử lại`,
      to: '/knowledge/queue?stage=failed',
      tone: 'danger',
    },
    schedule &&
      !schedule.lastRunOk && {
        text: 'Lần thu thập định kỳ gần nhất bị lỗi',
        to: '/knowledge/sources',
        tone: 'danger',
      },
    overdue > 0 && {
      text: `${overdue} văn bản chờ rà soát quá ${REVIEW_SLA_DAYS} ngày`,
      to: '/knowledge/queue?stage=review',
      tone: 'warning',
    },
    withWarnings > 0 && {
      text: `${withWarnings} văn bản chờ duyệt có cảnh báo bóc tách`,
      to: '/knowledge/queue?stage=review',
    },
  ].filter((a): a is AttentionItem => !!a)

  return (
    <KnowledgeLayout {...nav} section="overview" breadcrumb="Tổng quan">
      <h1 className="text-h1">Tổng quan</h1>
      <p className="text-fg-muted mt-3">
        Việc cần xử lý trước và tình trạng kho tri thức.
      </p>

      <AttentionList items={attention} loading={loading} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Chờ rà soát"
          value={num(s?.pending)}
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
          value={num(s && failed)}
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
          value={num(s?.indexed)}
          note={
            s ? `${s.indexing} đang index · ${s.parsing} đang bóc tách` : ''
          }
          to="/knowledge/documents"
        />
        <KpiCard
          label="Thu thập tháng này"
          value={num(s?.collectedThisMonth)}
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
        ) : (
          <p className="paper text-fg-muted mt-4 px-5 py-8 text-sm">
            {stats.isLoading
              ? 'Đang tải số liệu…'
              : (stats.error?.message ?? 'Không tải được số liệu.')}
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
