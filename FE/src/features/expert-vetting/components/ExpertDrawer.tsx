import { useTranslation } from 'react-i18next'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APPLICATION_STATUS, SERVICE_STATUS } from '@/lib/constants'
import { Modal } from '@/components/ui/feedback/modal'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { cn } from '@/lib/utils'
import type { Expert } from '../types'
import { formatVnd } from '@/lib/format-money'
import { formatDate, formatDateTime } from '../utils/applications'
import { ServiceAccessDialog } from './ServiceAccessDialog'
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
      <h3 className="text-fg-strong text-sm font-semibold">{title}</h3>
      <dl className="divide-border-subtle mt-1 divide-y text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[112px_1fr] gap-3 py-2.5">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg-strong min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-sunken rounded-control min-w-0 px-4 py-3">
      <p className="text-fg-muted text-xs">{label}</p>
      <div className="text-fg-strong mt-1 text-lg font-semibold">{children}</div>
    </div>
  )
}

/* Expert detail shown as a centered modal: key numbers on top, profile/service on
 * the left, review record and history on the right. */
export function ExpertDrawer({
  expert: e,
  onClose,
  onSetServiceStatus,
}: ExpertDrawerProps) {
  const { t } = useTranslation('admin')
  // Suspend and reinstate go through the same confirmation as the approval panel
  const [access, setAccess] = useState<ServiceAccessAction | null>(null)
  // Status chip plus, for an active service, where it shows (both from i18n, not split from one string)
  const statusLabel = t(`serviceStatus.${e.serviceStatus}.label`)
  const statusNote =
    e.serviceStatus === 'ACTIVE' ? t('serviceStatus.ACTIVE.note') : null
  const load = e.capacity > 0 ? Math.min(1, e.activeCases / e.capacity) : 0

  return (
    <Modal
      size="xl"
      title={e.name}
      titleAddon={
        <span className="flex shrink-0 items-center gap-2 text-sm">
          <StatusBadge
            status={{
              label: statusLabel,
              tone: SERVICE_STATUS[e.serviceStatus].tone,
            }}
          />
          {statusNote && (
            <span className="text-fg-muted hidden sm:inline">{statusNote}</span>
          )}
        </span>
      }
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

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            className="bg-paper mt-2 block h-1.5 overflow-hidden rounded-full"
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

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
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
                value: <span className="num">{e.applicationId ?? e.id}</span>,
              },
            ]}
          />

          {e.history.length > 0 && (
            <section>
              <h3 className="text-fg-strong text-sm font-semibold">
                {t('experts.drawer.history')}
              </h3>
              <ol className="border-border mt-3 ml-1 border-l text-sm">
                {e.history.map((h, i) => (
                  <li key={i} className="relative pb-4 pl-4 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="bg-accent ring-paper absolute top-1.5 -left-[4.5px] size-2 rounded-full ring-2"
                    />
                    <p className="text-fg-muted num text-xs">
                      {formatDateTime(h.at)}
                    </p>
                    <p className="text-fg-strong mt-0.5">
                      {h.actor} {h.text}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </Modal>
  )
}
