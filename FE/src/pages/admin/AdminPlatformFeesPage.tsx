import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { useFormatters } from '@/hooks/useFormatters'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { netOf } from '@/features/expert-pricing/model'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  cancelPendingPlatformFee,
  getPlatformFees,
  setPlatformFee,
  type PlatformFee,
} from '../../features/expert-vetting/api/platformFeeApi'
import { formatDate } from '../../features/expert-vetting/utils/applications'

const SAVE_ERRORS = [
  'PLATFORM_FEE_INVALID',
  'PLATFORM_FEE_TOO_SOON',
  'PLATFORM_FEE_NOT_PENDING',
  'SERVICE_NOT_FOUND',
] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)
// Sample prices that show the admin what experts receive before and after the change
const SAMPLE_PRICES = [500_000, 1_000_000, 2_000_000]

/** The platform's percent of each service; experts set their own prices on top of it */
export default function AdminPlatformFeesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const format = useFormatters()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PlatformFee | null>(null)
  const [percent, setPercent] = useState('')
  const [effectiveOn, setEffectiveOn] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const key = [...adminKeys.all, 'platform-fees'] as const
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getPlatformFees(signal),
  })
  const save = useMutation({
    mutationFn: (input: {
      serviceCode: string
      percent: number
      effectiveOn: string | null
    }) => setPlatformFee(input.serviceCode, input.percent, input.effectiveOn),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
  const cancel = useMutation({
    mutationFn: (serviceCode: string) => cancelPendingPlatformFee(serviceCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
  const rows = query.data ?? []
  const value = Number(percent)
  const maxPercent = editing?.maxPercent ?? 0
  // The very first fee applies at once; any later change needs its effective day
  const needsDate = editing?.percent != null
  const valid =
    /^\d+$/.test(percent.trim()) &&
    value >= 0 &&
    value <= maxPercent &&
    (!needsDate ||
      (effectiveOn !== '' && effectiveOn >= editing!.earliestEffectiveOn))

  const failed = (e: unknown) =>
    setToast(
      e instanceof ApiError && isSaveError(e.code)
        ? t(`admin:platformFees.errors.${e.code}`, {
            days: editing?.noticeDays,
            max: maxPercent,
          })
        : t('admin:platformFees.errors.failed')
    )
  const open = (row: PlatformFee) => {
    setEditing(row)
    setPercent(row.percent == null ? '' : String(row.percent))
    setEffectiveOn(row.percent == null ? '' : row.earliestEffectiveOn)
  }
  const confirm = () => {
    if (!editing || !valid) return
    save
      .mutateAsync({
        serviceCode: editing.serviceCode,
        percent: value,
        effectiveOn: needsDate ? effectiveOn : null,
      })
      .then(() => {
        setToast(t('admin:platformFees.saved', { name: editing.serviceName }))
        setEditing(null)
      })
      .catch(failed)
  }
  const withdraw = (row: PlatformFee) =>
    cancel
      .mutateAsync(row.serviceCode)
      .then(() =>
        setToast(t('admin:platformFees.cancelled', { name: row.serviceName }))
      )
      .catch(failed)

  return (
    <AdminLayout
      {...nav}
      section="platformFees"
      breadcrumb={t('admin:navigation.platformFees')}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-h1">{t('admin:platformFees.title')}</h1>
        <HelpTip label={t('admin:platformFees.helpLabel')}>
          {t('admin:platformFees.description')}
        </HelpTip>
      </div>

      <section className="paper mt-12 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
              <th>{t('admin:platformFees.service')}</th>
              <th>{t('admin:platformFees.percent')}</th>
              <th>{t('admin:platformFees.effectiveFrom')}</th>
              <th>{t('admin:platformFees.pending')}</th>
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
                <td className="num">
                  {row.pending
                    ? t('admin:platformFees.pendingValue', {
                        percent: row.pending.percent,
                        date: formatDate(row.pending.effectiveFrom),
                      })
                    : '—'}
                </td>
                <td className="text-right whitespace-nowrap">
                  {row.pending && (
                    <button
                      type="button"
                      className="btn btn-press btn-secondary mr-2"
                      disabled={cancel.isPending}
                      onClick={() => void withdraw(row)}
                    >
                      {t('admin:platformFees.cancelPending')}
                    </button>
                  )}
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
                  colSpan={5}
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
            {t('admin:platformFees.percentLabel', { max: maxPercent })}
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
          {needsDate && (
            <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
              <span className="flex items-center gap-2">
                {t('admin:platformFees.effectiveOnLabel')}
                <HelpTip label={t('admin:platformFees.effectiveOnLabel')}>
                  {t('admin:platformFees.effectiveOnHelp', {
                    days: editing.noticeDays,
                    date: formatDate(editing.earliestEffectiveOn),
                  })}
                </HelpTip>
              </span>
              <input
                type="date"
                min={editing.earliestEffectiveOn}
                value={effectiveOn}
                onChange={(e) => setEffectiveOn(e.target.value)}
                className="border-border-control rounded-control shadow-control bg-paper border px-3 py-2 text-base font-normal"
              />
            </label>
          )}
          {valid && editing.percent != null && editing.percent !== value && (
            <table className="mt-4 w-full text-sm">
              <caption className="text-fg-strong mb-2 text-left font-semibold">
                {t('admin:platformFees.example')}
              </caption>
              <thead className="text-fg-muted">
                <tr className="[&>th]:py-1 [&>th]:text-left [&>th]:font-semibold">
                  <th>{t('admin:platformFees.examplePrice')}</th>
                  <th>{t('admin:platformFees.exampleNet')}</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_PRICES.map((price) => (
                  <tr key={price} className="[&>td]:py-1">
                    <td className="num">{format.money(price)}</td>
                    <td className="num">
                      {`${format.money(netOf(price, editing.percent!))} → ${format.money(netOf(price, value))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-fg-muted mt-3 text-sm">
            {needsDate
              ? t('admin:platformFees.dialogHelp')
              : t('admin:platformFees.firstFeeHelp')}
          </p>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
