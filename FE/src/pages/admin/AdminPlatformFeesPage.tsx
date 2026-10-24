import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  getPlatformFees,
  setPlatformFee,
  type PlatformFee,
} from '../../features/expert-vetting/api/platformFeeApi'
import { formatDate } from '../../features/expert-vetting/utils/applications'

const MAX_PERCENT = 99
const SAVE_ERRORS = ['PLATFORM_FEE_INVALID', 'SERVICE_NOT_FOUND'] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)

/** The platform's percent of each service; experts set their own prices on top of it */
export default function AdminPlatformFeesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PlatformFee | null>(null)
  const [percent, setPercent] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const key = [...adminKeys.all, 'platform-fees'] as const
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getPlatformFees(signal),
  })
  const save = useMutation({
    mutationFn: (input: { serviceCode: string; percent: number }) =>
      setPlatformFee(input.serviceCode, input.percent),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
  const rows = query.data ?? []
  const value = Number(percent)
  const valid =
    /^\d+$/.test(percent.trim()) && value >= 0 && value <= MAX_PERCENT

  const open = (row: PlatformFee) => {
    setEditing(row)
    setPercent(row.percent == null ? '' : String(row.percent))
  }
  const confirm = () => {
    if (!editing || !valid) return
    save
      .mutateAsync({ serviceCode: editing.serviceCode, percent: value })
      .then(() => {
        setToast(t('admin:platformFees.saved', { name: editing.serviceName }))
        setEditing(null)
      })
      .catch((e: unknown) =>
        setToast(
          e instanceof ApiError && isSaveError(e.code)
            ? t(`admin:platformFees.errors.${e.code}`)
            : t('admin:platformFees.errors.failed')
        )
      )
  }

  return (
    <AdminLayout
      {...nav}
      section="platformFees"
      breadcrumb={t('admin:navigation.platformFees')}
    >
      <h1 className="text-h1">{t('admin:platformFees.title')}</h1>
      <p className="text-fg-muted mt-3">
        {t('admin:platformFees.description')}
      </p>

      <section className="paper mt-12 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
              <th>{t('admin:platformFees.service')}</th>
              <th>{t('admin:platformFees.percent')}</th>
              <th>{t('admin:platformFees.effectiveFrom')}</th>
              <th>
                <span className="sr-only">
                  {t('admin:applicationsTable.actions')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.serviceCode}
                className="border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3"
              >
                <td>
                  <div className="text-fg-strong font-semibold">
                    {row.serviceName}
                  </div>
                  <div className="text-fg-muted">{row.serviceCode}</div>
                </td>
                <td className="num">
                  {row.percent == null ? (
                    <span className="text-warning">
                      {t('admin:platformFees.notSet')}
                    </span>
                  ) : (
                    `${row.percent}%`
                  )}
                </td>
                <td className="num">
                  {row.effectiveFrom ? formatDate(row.effectiveFrom) : '—'}
                </td>
                <td className="text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="btn btn-press btn-secondary"
                    onClick={() => open(row)}
                  >
                    {row.percent == null
                      ? t('admin:platformFees.set')
                      : t('admin:platformFees.change')}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={4}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {query.isLoading
                    ? t('common:loading')
                    : (query.error?.message ?? t('admin:platformFees.empty'))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editing && (
        <Modal
          title={t('admin:platformFees.dialog', { name: editing.serviceName })}
          onClose={() => setEditing(null)}
          onSubmit={confirm}
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn btn-press btn-secondary"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={save.isPending || !valid}
                className="btn btn-press btn-primary"
              >
                {t('admin:platformFees.save')}
              </button>
            </>
          }
        >
          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
            {t('admin:platformFees.percentLabel', { max: MAX_PERCENT })}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              aria-invalid={percent !== '' && !valid}
              className="border-border-control rounded-control shadow-control bg-paper border px-3 py-2 text-base font-normal"
            />
          </label>
          <p className="text-fg-muted mt-3 text-sm">
            {t('admin:platformFees.dialogHelp')}
          </p>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
