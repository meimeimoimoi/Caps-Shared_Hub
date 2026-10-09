import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('admin')
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
            {t('experts.drawer.viewApplication')}
          </Link>
          {/* MOCK: đổi trạng thái tại chỗ. TODO(api): PATCH trạng thái dịch vụ */}
          {e.serviceStatus === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => onSetServiceStatus('SUSPENDED')}
              className="btn btn-press bg-danger text-paper"
            >
              {t('experts.drawer.suspend')}
            </button>
          )}
          {e.serviceStatus === 'SUSPENDED' && (
            <button
              type="button"
              onClick={() => onSetServiceStatus('ACTIVE')}
              className="btn btn-press btn-primary"
            >
              {t('experts.drawer.resume')}
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
          title={t('experts.drawer.info')}
          rows={[
            { label: t('experts.drawer.email'), value: e.email },
            {
              label: t('experts.drawer.experience'),
              value: (
                <span className="num">
                  {t('detail.meta.years', { count: e.experienceYears })}
                </span>
              ),
            },
            { label: t('experts.drawer.fields'), value: e.fields.join(', ') },
          ]}
        />
        <Section
          title={t('experts.drawer.service')}
          rows={[
            {
              label: t('experts.drawer.fee'),
              value:
                e.fee === null ? (
                  '—'
                ) : (
                  <strong className="num">{formatVnd(e.fee)}</strong>
                ),
            },
            { label: t('experts.drawer.schedule'), value: e.schedule },
            {
              label: t('experts.drawer.active'),
              value: (
                <span className="num">
                  {t('experts.drawer.activeValue', {
                    active: e.activeCases,
                    capacity: e.capacity,
                  })}
                </span>
              ),
            },
          ]}
        />
        <Section
          title={t('experts.drawer.review')}
          rows={[
            {
              label: t('experts.drawer.result'),
              value: <StatusBadge status={APPLICATION_STATUS.APPROVED} />,
            },
            { label: t('experts.drawer.reviewer'), value: e.reviewer },
            {
              label: t('experts.drawer.approvedAt'),
              value: <span className="num">{formatDate(e.approvedAt)}</span>,
            },
            {
              label: t('experts.drawer.application'),
              value: <span className="num">{e.id}</span>,
            },
          ]}
        />

        <section className="mt-5">
          <h3 className="text-fg-strong text-sm font-semibold">
            {t('experts.drawer.history')}
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
