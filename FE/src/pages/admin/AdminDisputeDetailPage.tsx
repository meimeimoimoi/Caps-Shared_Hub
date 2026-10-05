import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CASE_STATUS } from '@/lib/constants'
import { CaseHeader } from '@/components/ui/case-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Toast } from '@/components/ui/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { DisputeDecision } from '../../features/disputes-escrow/components/DisputeDecision'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { DISPUTE_SLA_HOURS } from '../../features/disputes-escrow/constants'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useDispute } from '../../features/disputes-escrow/hooks/useDispute'

export default function AdminDisputeDetailPage() {
  // ponytail: chưa có trang danh sách khiếu nại, /admin/disputes mở khiếu nại đang mở đầu tiên
  const params = useParams()
  const { id, dispute, isLoading, decide } = useDispute(params.id)
  const nav = useAdminNav()
  const [now] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const listLink = <span>Khiếu nại</span>
  const layout = { ...nav, section: 'disputes' as const }

  if (!dispute) {
    return (
      <AdminLayout {...layout} breadcrumb={listLink}>
        <h1 className="text-h1-tool">
          {isLoading ? 'Đang tải…' : `Không tìm thấy khiếu nại ${id ?? ''}`}
        </h1>
        <Link
          to="/admin/disputes"
          className="text-accent-text mt-3 inline-block underline"
        >
          Quay lại
        </Link>
      </AdminLayout>
    )
  }

  const { evidence, complaint } = dispute
  const hoursLeft = Math.max(
    0,
    DISPUTE_SLA_HOURS -
      Math.floor((now - new Date(dispute.openedAt).getTime()) / 3_600_000)
  )

  return (
    <AdminLayout
      {...layout}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong num" aria-current="page">
            {dispute.id}
          </span>
        </>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <CaseHeader
          code={dispute.id}
          title={`Tranh chấp · ${dispute.title}`}
          meta={[
            ['Client', dispute.client],
            ['Chuyên gia', dispute.expert],
            ['Căn cứ', dispute.ground],
          ]}
        />
        <StatusBadge status={CASE_STATUS.DISPUTED} />
      </div>

      <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(420px,1fr)_340px]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          <section className="paper p-5 md:p-6">
            <h2 className="text-h2">
              Bằng chứng: bản nháp AI so với bản chuyên gia sửa
            </h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="bg-sunken rounded-surface p-3">
                <p className="text-fg-muted text-caption">
                  {evidence.draft.label}
                </p>
                <p className="mt-1">
                  {evidence.draft.text}
                  <del className="text-fg-muted">{evidence.draft.change}</del>
                </p>
              </div>
              <div className="bg-sunken rounded-surface p-3">
                <p className="text-fg-muted text-caption">
                  {evidence.revision.label}
                </p>
                <p className="mt-1">
                  {evidence.revision.text}
                  <ins className="text-revised">{evidence.revision.change}</ins>
                </p>
              </div>
            </div>
            <p className="text-fg-muted mt-3 text-sm">{evidence.note}</p>
          </section>

          <section className="paper p-5 md:p-6">
            <h2 className="text-h2">Khiếu nại của Client</h2>
            <dl className="divide-border-subtle mt-3 divide-y text-sm">
              {[
                ['Vấn đề', complaint.issue],
                ['Mô tả', complaint.description],
                [
                  'Bằng chứng',
                  // TODO(api): link tải file bằng chứng
                  <span key="file" className="underline underline-offset-4">
                    {complaint.attachment}
                  </span>,
                ],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="grid grid-cols-[110px_1fr] gap-3 py-2"
                >
                  <dt className="text-fg-muted">{label}</dt>
                  <dd className="text-fg-strong">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <HistoryTab
            title="Nhật ký hồ sơ (audit log)"
            history={dispute.history}
          />
        </div>

        <div className="lg:sticky lg:top-20">
          <DisputeDecision
            hoursLeft={hoursLeft}
            decided={!!dispute.resolvedAt}
            onDecide={(outcome, reason) =>
              decide({ outcome, reason })
                .then(() => setToast('Đã ra quyết định trọng tài'))
                .catch((e: Error) => setToast(e.message))
            }
          />
        </div>
      </div>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
