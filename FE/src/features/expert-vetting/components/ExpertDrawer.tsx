import { useTranslation } from 'react-i18next'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APPLICATION_STATUS, SERVICE_STATUS } from '@/lib/constants'
import { Modal } from '@/components/ui/feedback/modal'
import { Pagination } from '@/components/ui/navigation/pagination'
import { usePagination } from '@/hooks/usePagination'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { cn } from '@/lib/utils'
import type { Expert } from '../types'
import { formatVnd } from '@/lib/format-money'
import { formatDate, formatDateTime } from '../utils/applications'
import { ServiceAccessDialog } from './ServiceAccessDialog'
import { ExpertViolationsSection } from './ExpertViolationsSection'
import type { ServiceAccessAction } from '../types'

interface ExpertDrawerProps {
  expert: Expert
  onClose: () => void
  /** A suspension carries the admin's note (required by the API) */
  onSetServiceStatus: (
    status: Expert['serviceStatus'],
    note?: string
  ) => Promise<unknown> | void
}

function Section({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <section>
      <h3 className="text-fg-strong border-border-subtle border-b pb-3 text-base font-semibold">{title}</h3>
      <dl className="divide-border-subtle mt-1 divide-y text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg-strong min-w-0 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-fg-muted text-sm">{label}</p>
      <div className="text-fg-strong mt-2 text-2xl font-semibold">{children}</div>
    </div>
  )
}

/* Keep summary metrics above profile and review details, with a full-width audit history. */
export function ExpertDrawer({
  expert: e,
  onClose,
  onSetServiceStatus,
}: ExpertDrawerProps) {
  const { t } = useTranslation('admin')
  // Suspend and reinstate go through the same confirmation as the approval panel
  const [access, setAccess] = useState<ServiceAccessAction | null>(null)
  // Keep the service state separate from the expert name.
  const statusLabel = t(`serviceStatus.${e.serviceStatus}.label`)
  const statusNote =
    e.serviceStatus === 'ACTIVE' ? t('serviceStatus.ACTIVE.note') : null
  const history = usePagination(e.history, e.id, 5)
  const load = e.capacity > 0 ? Math.min(1, e.activeCases / e.capacity) : 0

  return (
    <Modal
      size="xl"
      title={e.name}
      onClose={onClose}
      footer={
        <>
          <Link
            to={`/admin/experts/${e.applicationId ?? e.id}`}
            className="btn btn-press btn-secondary no-underline"
          >
            {t('experts.drawer.viewApplication')}
          </Link>
          {e.serviceStatus !== 'SUSPENDED' && (
            <button
              type="button"
              onClick={() => setAccess('SUSPEND')}
              className="btn btn-press btn-danger"
            >
              {t('experts.drawer.suspend')}
            </button>
          )}
          {e.serviceStatus === 'SUSPENDED' && (
            <button
              type="button"
              onClick={() => setAccess('REINSTATE')}
              className="btn btn-press btn-primary"
            >
              {t('experts.drawer.resume')}
            </button>
          )}
        </>
      }
    >
      {access && (
        <ServiceAccessDialog
          action={access}
          expertName={e.name}
          serviceName={e.serviceName}
          onConfirm={(note) =>
            onSetServiceStatus(
              access === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE',
              note || undefined
            )
          }
          onClose={() => setAccess(null)}
        />
      )}

      <div className="border-border-subtle mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-5">
        <StatusBadge
          status={{
            label: statusLabel,
            tone: e.serviceStatus === 'ACTIVE' ? 'success' : SERVICE_STATUS[e.serviceStatus].tone,
          }}
        />
        {statusNote && <span className="text-fg text-sm">{statusNote}</span>}
      </div>

      <div className="bg-sunken divide-border-subtle mt-5 grid grid-cols-1 divide-y rounded-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label={t('experts.drawer.fee')}>
          <span className="num">{e.fee === null ? '—' : formatVnd(e.fee)}</span>
        </Stat>
        <Stat label={t('experts.drawer.active')}>
          <span className="num">
            {t('experts.drawer.activeValue', {
              active: e.activeCases,
              capacity: e.capacity,
            })}
          </span>
          <span
            aria-hidden="true"
            className="bg-border mt-3 block h-1.5 overflow-hidden rounded-full"
          >
            <span
              className={cn(
                'block h-full rounded-full',
                load >= 1 ? 'bg-warning' : 'bg-accent',
              )}
              style={{ width: `${load * 100}%` }}
            />
          </span>
        </Stat>
        <Stat label={t('experts.drawer.experience')}>
          <span className="num">
            {t('detail.meta.years', { count: e.experienceYears })}
          </span>
        </Stat>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            title={t('experts.drawer.info')}
            rows={[
              { label: t('experts.drawer.email'), value: e.email },
              {
                label: t('experts.drawer.fields'),
                value: (
                  <ul className="flex flex-wrap gap-1.5">
                    {e.fields.map((f) => (
                      <li
                        key={f}
                        className="bg-sunken border-border text-fg rounded-md border px-2 py-0.5 text-xs"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
          <Section
            title={t('experts.drawer.service')}
            rows={[
              ...(e.serviceName
                ? [{ label: t('experts.drawer.serviceName'), value: e.serviceName }]
                : []),
              { label: t('experts.drawer.schedule'), value: e.schedule },
            ]}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
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
                value: (
                  <Link
                    to={`/admin/experts/${e.applicationId ?? e.id}`}
                    className="text-accent-text num text-xs underline underline-offset-4 hover:no-underline"
                  >
                    {e.applicationId ?? e.id}
                  </Link>
                ),
              },
            ]}
          />

        </div>
      </div>

      {e.expertId && <ExpertViolationsSection expertId={e.expertId} />}

      {history.total > 0 && (
        <section className="border-border-subtle mt-7 border-t pt-6">
          <h3 className="text-fg-strong text-base font-semibold">
            {t('experts.drawer.history')}
          </h3>
          <ol className="divide-border-subtle mt-3 divide-y text-sm">
            {history.rows.map((h, i) => (
              <li key={`${h.at}-${i}`} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-5">
                <time dateTime={h.at} className="text-fg-muted num text-xs leading-6">
                  {formatDateTime(h.at)}
                </time>
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className="text-fg-strong font-semibold">{h.actor}</p>
                  <p className="text-fg mt-1 leading-relaxed">{h.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {history.pageCount > 1 && (
            <Pagination
              page={history.page}
              pageSize={history.pageSize}
              total={history.total}
              onPageChange={history.setPage}
            />
          )}
        </section>
      )}
    </Modal>
  )
}
