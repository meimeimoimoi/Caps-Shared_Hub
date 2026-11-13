import { useCallback, useState } from 'react'
import { ListFilter, Tags } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SERVICE_STATUS } from '@/lib/constants'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Toast } from '@/components/ui/feedback/toast'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { TablePager } from '@/components/ui/navigation/table-pager'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { formatDate } from '../../features/expert-vetting/utils/applications'
import { formatVnd } from '@/lib/format-money'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useExperts, ALL } from '../../features/expert-vetting/hooks/useExperts'
import { ExpertDrawer } from '../../features/expert-vetting/components/ExpertDrawer'
import type { Expert } from '../../features/expert-vetting/types'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'

// Compact toolbar filters, same look as the review assignments page.
const filterCls =
  'inline-flex min-w-0 flex-col items-start text-xs [&>span]:sr-only'
const filterTriggerCls =
  '!h-9 !min-h-9 !w-auto !gap-2 !rounded-md !px-3 !py-0 text-sm !shadow-none'
const MAX_FIELD_TAGS = 2

export default function AdminExpertsPage() {
  const nav = useAdminNav()
  const experts = useExperts()
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const { paged } = experts
  const { t } = useTranslation(['admin', 'common'])

  const statusOptions = [
    { value: ALL, label: t('admin:experts.allStatuses') },
    ...Object.entries(SERVICE_STATUS).map(([key, s]) => ({
      value: key,
      label: s.label,
    })),
  ]
  const fieldOptions = [
    { value: ALL, label: t('admin:experts.allFields') },
    ...experts.fields.map((f) => ({ value: f, label: f })),
  ]

  return (
    <AdminLayout
      {...nav}
      section="experts"
      breadcrumb={t('admin:navigation.manageExperts')}
      pendingCount={nav.pendingCount}
      search={experts.query}
      onSearchChange={experts.setQuery}
    >
      <PageHeader
        title={t('admin:experts.title')}
        help={t('admin:experts.description')}
        helpLabel={t('admin:experts.helpLabel')}
      />

      <div className="mt-8 mb-4 flex flex-wrap items-center gap-2">
        <CustomSelect
          label={t('admin:experts.serviceStatus')}
          value={experts.status}
          options={statusOptions}
          onChange={(value) =>
            experts.setStatus(value as Expert['serviceStatus'] | typeof ALL)
          }
          triggerLeading={
            <ListFilter
              size={14}
              aria-hidden="true"
              className="text-text-muted"
            />
          }
          className={filterCls}
          triggerClassName={filterTriggerCls}
        />
        <CustomSelect
          label={t('admin:experts.field')}
          value={experts.field}
          options={fieldOptions}
          onChange={experts.setField}
          triggerLeading={
            <Tags size={14} aria-hidden="true" className="text-text-muted" />
          }
          className={filterCls}
          triggerClassName={filterTriggerCls}
          menuClassName="min-w-64"
        />
        <span className="text-fg-muted ml-auto text-sm" aria-live="polite">
          <span className="num text-fg-strong font-semibold">
            {paged.total}
          </span>{' '}
          {t('admin:experts.expertCount')}
        </span>
      </div>

      <section className="paper overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead className="bg-sunken text-fg-muted text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:whitespace-nowrap">
              <th>{t('admin:experts.table.expert')}</th>
              <th>{t('admin:experts.table.field')}</th>
              <th>{t('admin:experts.table.serviceStatus')}</th>
              <th className="text-right">
                {t('admin:experts.table.reviewFee')}
              </th>
              <th className="text-right">
                {t('admin:experts.table.activeCases')}
              </th>
              <th className="text-right">
                {t('admin:experts.table.approvedAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((e) => {
              const extraFields = e.fields.length - MAX_FIELD_TAGS
              const load =
                e.capacity > 0 ? Math.min(1, e.activeCases / e.capacity) : 0
              return (
                <tr
                  key={e.id}
                  // The whole row opens the drawer; the name button keeps keyboard access.
                  onClick={() => experts.select(e.id)}
                  className={cn(
                    'border-border motion-interactive cursor-pointer border-b last:border-b-0 [&>td]:px-4 [&>td]:py-3',
                    experts.selected?.id === e.id
                      ? 'bg-accent-soft'
                      : 'hover:bg-sunken'
                  )}
                >
                  <td>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        experts.select(e.id)
                      }}
                      className="text-fg-strong hover:text-accent-text focus-visible:outline-accent-text text-left font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {e.name}
                    </button>
                    <div className="text-fg-muted text-xs">{e.email}</div>
                  </td>
                  <td>
                    <ul
                      className="flex max-w-72 flex-wrap gap-1.5"
                      title={e.fields.join(', ')}
                    >
                      {e.fields.slice(0, MAX_FIELD_TAGS).map((f) => (
                        <li
                          key={f}
                          className="bg-sunken border-border text-fg rounded-md border px-2 py-0.5 text-xs whitespace-nowrap"
                        >
                          {f}
                        </li>
                      ))}
                      {extraFields > 0 && (
                        <li className="text-fg-muted px-1 py-0.5 text-xs">
                          +{extraFields}
                        </li>
                      )}
                    </ul>
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={SERVICE_STATUS[e.serviceStatus]} />
                  </td>
                  <td className="num text-fg-strong text-right whitespace-nowrap">
                    {e.fee === null ? '—' : formatVnd(e.fee)}
                  </td>
                  <td className="text-right">
                    <span className="num">
                      {e.activeCases}/{e.capacity}
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-sunken mt-1 ml-auto block h-1 w-12 overflow-hidden rounded-full"
                    >
                      <span
                        className={cn(
                          'block h-full rounded-full',
                          load >= 1 ? 'bg-warning' : 'bg-accent'
                        )}
                        style={{ width: `${load * 100}%` }}
                      />
                    </span>
                  </td>
                  <td className="num text-fg-muted text-right whitespace-nowrap">
                    {formatDate(e.approvedAt)}
                  </td>
                </tr>
              )
            })}
            {paged.rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {experts.isLoading ? (
                    t('common:loading')
                  ) : experts.error ? (
                    <LoadError />
                  ) : (
                    t('admin:experts.noResults')
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePager paged={paged} onPrev={experts.prev} onNext={experts.next} />
      </section>

      {experts.selected && (
        <ExpertDrawer
          key={`${experts.selected.id}-${experts.selected.serviceStatus}`}
          expert={experts.selected}
          onClose={() => experts.select(null)}
          onSetServiceStatus={(status, note) =>
            experts
              .setServiceStatus(experts.selected!.id, status, note)
              .then(() =>
                setToast(
                  status === 'SUSPENDED'
                    ? t('admin:experts.toast.suspended')
                    : t('admin:experts.toast.reinstated')
                )
              )
              .catch((e: Error) => setToast(e.message))
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
