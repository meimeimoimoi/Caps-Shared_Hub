import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APPLICATION_STATUS, SERVICE_STATUS } from '@/lib/constants'
import { Drawer } from '@/components/ui/feedback/drawer'
import { StatusBadge } from '@/components/ui/display/status-badge'
import type { Expert } from '../types'
import { formatVnd } from '@/lib/format-money'
import { formatDate, formatDateTime } from '../utils/applications'

interface ExpertDrawerProps {
  expert: Expert
  onClose: () => void
  onSetServiceStatus: (status: Expert['serviceStatus']) => void
}

function Section({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="text-fg-strong text-sm font-semibold">{title}</h3>
      <dl className="divide-border-subtle mt-1 divide-y text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg-strong">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ExpertDrawer({
  expert: e,
  onClose,
  onSetServiceStatus,
}: ExpertDrawerProps) {
  // "Đang hoạt động · hiện trên Marketplace" → chip phần đầu, chữ phụ phần sau
  const [statusLabel, statusNote] =
    SERVICE_STATUS[e.serviceStatus].label.split(' · ')

  return (
    <Drawer
      title={e.name}
      onClose={onClose}
      footer={
        <>
          <Link
            to={`/admin/experts/${e.id}`}
            className="btn btn-press btn-secondary no-underline"
          >
            Xem đơn đăng ký
          </Link>
          {/* MOCK: đổi trạng thái tại chỗ. TODO(api): PATCH trạng thái dịch vụ */}
          {e.serviceStatus === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => onSetServiceStatus('SUSPENDED')}
              className="btn btn-press bg-danger text-paper"
            >
              Tạm ngưng dịch vụ
            </button>
          )}
          {e.serviceStatus === 'SUSPENDED' && (
            <button
              type="button"
              onClick={() => onSetServiceStatus('ACTIVE')}
              className="btn btn-press btn-primary"
            >
              Mở lại dịch vụ
            </button>
          )}
        </>
      }
    >
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {e.serviceStatus === 'ACTIVE' ? (
          <StatusBadge status={{ label: statusLabel, tone: 'success' }} />
        ) : (
          <StatusBadge status={SERVICE_STATUS[e.serviceStatus]} />
        )}
        {statusNote && <span className="text-fg-muted">{statusNote}</span>}
      </p>

      <div className="mt-5">
        <Section
          title="Thông tin"
          rows={[
            { label: 'Email', value: e.email },
            {
              label: 'Kinh nghiệm',
              value: (
                <>
                  <span className="num">{e.experienceYears}</span> năm
                </>
              ),
            },
            { label: 'Lĩnh vực', value: e.fields.join(', ') },
          ]}
        />
        <Section
          title="Dịch vụ"
          rows={[
            {
              label: 'Phí rà soát',
              value:
                e.fee === null ? (
                  '—'
                ) : (
                  <strong className="num">{formatVnd(e.fee)}</strong>
                ),
            },
            { label: 'Lịch nhận việc', value: e.schedule },
            {
              label: 'Đang nhận',
              value: (
                <>
                  <span className="num">
                    {e.activeCases}/{e.capacity}
                  </span>{' '}
                  hồ sơ
                </>
              ),
            },
          ]}
        />
        <Section
          title="Xét duyệt"
          rows={[
            {
              label: 'Kết quả',
              value: <StatusBadge status={APPLICATION_STATUS.APPROVED} />,
            },
            { label: 'Người duyệt', value: e.reviewer },
            {
              label: 'Ngày duyệt',
              value: <span className="num">{formatDate(e.approvedAt)}</span>,
            },
            {
              label: 'Đơn đăng ký',
              value: <span className="num">{e.id}</span>,
            },
          ]}
        />

        <section className="mt-5">
          <h3 className="text-fg-strong text-sm font-semibold">
            Lịch sử thao tác
          </h3>
          <ol className="divide-border-subtle mt-1 divide-y text-sm">
            {e.history.map((h, i) => (
              <li key={i} className="py-2">
                <p className="text-fg-muted num">{formatDateTime(h.at)}</p>
                <p className="text-fg-strong">
                  {h.actor} {h.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Drawer>
  )
}
