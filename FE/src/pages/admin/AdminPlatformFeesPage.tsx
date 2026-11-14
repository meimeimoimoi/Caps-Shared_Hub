import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import {
  errorToast,
  type ToastContent,
} from '@/components/ui/feedback/toast-content'
import { useFormatters } from '@/hooks/useFormatters'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { netOf } from '@/features/expert-pricing/model'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  cancelPendingPlatformFee,
  getPlatformFees,
  setPlatformFee,
  type LateRule,
  type NoResponseRule,
  type PlatformFee,
} from '../../features/expert-vetting/api/platformFeeApi'
import { formatDate } from '../../features/expert-vetting/utils/applications'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'

const LATE_FIELDS = ['penaltyHours', 'penaltyPercent', 'cancelHours'] as const
type LateDraft = Record<(typeof LATE_FIELDS)[number], string>
// Suggested rule for a service that has none yet: an incident refunds 50% (agreed 2026-11-11)
const DEFAULT_LATE: LateRule = {
  penaltyHours: 24,
  penaltyPercent: 50,
  cancelHours: 72,
}
// Agreed platform share; a service's first fee starts here
const DEFAULT_PERCENT = 40
// Mirror PlatformFee.MaxLateHours and PlatformFee.MaxNoResponseHours on the server
const MAX_LATE_HOURS = 720
const MAX_NO_RESPONSE_HOURS = 72
const toDraft = (late: LateRule): LateDraft => ({
  penaltyHours: String(late.penaltyHours),
  penaltyPercent: String(late.penaltyPercent),
  cancelHours: String(late.cancelHours),
})
const NO_RESPONSE_FIELDS = ['hours', 'refundPercent', 'expertPercent'] as const
type NoResponseDraft = Record<(typeof NO_RESPONSE_FIELDS)[number], string>
// Client did not supply the requested info: no refund, the fee splits 60/40 (agreed 2026-11-11)
const DEFAULT_NO_RESPONSE: NoResponseRule = {
  hours: 72,
  refundPercent: 0,
  expertPercent: 60,
}
const toNoResponseDraft = (rule: NoResponseRule): NoResponseDraft => ({
  hours: String(rule.hours),
  refundPercent: String(rule.refundPercent),
  expertPercent: String(rule.expertPercent),
})
const isWhole = (text: string) => /^\d+$/.test(text.trim())

const SAVE_ERRORS = [
  'PLATFORM_FEE_INVALID',
  'LATE_RULE_INVALID',
  'NO_RESPONSE_RULE_INVALID',
  'PLATFORM_FEE_TOO_SOON',
  'PLATFORM_FEE_NOT_PENDING',
  'SERVICE_NOT_FOUND',
] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)
// Sample prices that show the admin what experts receive before and after the change
const SAMPLE_PRICES = [500_000, 1_000_000, 2_000_000]

/** One clause per line, so a rule cell never breaks mid-clause */
function Clauses({ text }: { text: string }) {
  return (
    <ul className="space-y-0.5">
      {text.split(' · ').map((clause) => (
        <li key={clause}>
          {clause}
        </li>
      ))}
    </ul>
  )
}

/** The numeric inputs of one case rule (late delivery, client silence) under its legend and help */
function RuleFields<K extends string>({
  legend,
  help,
  fields,
  label,
  draft,
  onChange,
  error,
  note,
}: {
  legend: string
  help: string
  fields: readonly K[]
  label: (field: K) => string
  draft: Record<K, string>
  onChange: (field: K, value: string) => void
  /** Which rule the values break, shown under the inputs */
  error?: string | null
  /** Live result of the values, e.g. what the platform keeps */
  note?: string
}) {
  const errorId = useId()
  return (
    <fieldset className="mt-4">
      <legend className="flex items-center gap-2 text-sm font-semibold">
        {legend}
        <HelpTip label={legend}>{help}</HelpTip>
      </legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <label
            key={field}
            className="flex flex-col gap-2 text-sm font-semibold"
          >
            {label(field)}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft[field]}
              onChange={(e) => onChange(field, e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="border-border-control rounded-control shadow-control bg-paper aria-[invalid=true]:border-danger border px-3 py-2 text-base font-normal"
            />
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-danger mt-2 text-sm">
          {error}
        </p>
      ) : (
        note && <p className="text-fg-strong mt-2 text-sm">{note}</p>
      )}
    </fieldset>
  )
}

/** The platform's percent of each service; experts set their own prices on top of it */
export default function AdminPlatformFeesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const format = useFormatters()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PlatformFee | null>(null)
  const [percent, setPercent] = useState('')
  const [late, setLate] = useState<LateDraft>(toDraft(DEFAULT_LATE))
  const [noResponse, setNoResponse] = useState<NoResponseDraft>(
    toNoResponseDraft(DEFAULT_NO_RESPONSE)
  )
  const [effectiveOn, setEffectiveOn] = useState('')
  const [toast, setToast] = useState<ToastContent | null>(null)
  const [withdrawing, setWithdrawing] = useState<PlatformFee | null>(null)
  // Saving a fee moves money for every new request, so the edit is reviewed before it is sent
  const [reviewing, setReviewing] = useState(false)
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
      late: LateRule
      noResponse: NoResponseRule
      effectiveOn: string | null
    }) =>
      setPlatformFee(
        input.serviceCode,
        input.percent,
        input.late,
        input.noResponse,
        input.effectiveOn
      ),
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
  const lateRule: LateRule = {
    penaltyHours: Number(late.penaltyHours),
    penaltyPercent: Number(late.penaltyPercent),
    cancelHours: Number(late.cancelHours),
  }
  // Same rule as the server: the penalty comes out of what the platform fee leaves the expert
  const lateValid =
    LATE_FIELDS.every((f) => isWhole(late[f])) &&
    value + lateRule.penaltyPercent <= 100 &&
    lateRule.cancelHours >= lateRule.penaltyHours &&
    lateRule.cancelHours <= MAX_LATE_HOURS
  const noResponseRule: NoResponseRule = {
    hours: Number(noResponse.hours),
    refundPercent: Number(noResponse.refundPercent),
    expertPercent: Number(noResponse.expertPercent),
  }
  // Same rule as the server: the platform keeps what the client and the expert do not get
  const noResponseValid =
    NO_RESPONSE_FIELDS.every((f) => isWhole(noResponse[f])) &&
    noResponseRule.hours >= 1 &&
    noResponseRule.hours <= MAX_NO_RESPONSE_HOURS &&
    noResponseRule.refundPercent + noResponseRule.expertPercent <= 100
  // One message per broken rule, same rules as the checks above
  const percentError =
    percent !== '' && !(isWhole(percent) && value >= 0 && value <= maxPercent)
      ? t('admin:platformFees.errors.PLATFORM_FEE_INVALID', { max: maxPercent })
      : null
  const lateError = !LATE_FIELDS.every((f) => isWhole(late[f]))
    ? t('admin:platformFees.rules.wholeNumbers')
    : lateRule.cancelHours > MAX_LATE_HOURS
      ? t('admin:platformFees.rules.maxHours', { max: MAX_LATE_HOURS })
      : lateRule.cancelHours < lateRule.penaltyHours
        ? t('admin:platformFees.rules.cancelBeforePenalty')
        : value + lateRule.penaltyPercent > 100
          ? t('admin:platformFees.rules.penaltyOverFee', {
              sum: value + lateRule.penaltyPercent,
            })
          : null
  const noResponseError = !NO_RESPONSE_FIELDS.every((f) =>
    isWhole(noResponse[f])
  )
    ? t('admin:platformFees.rules.wholeNumbers')
    : noResponseRule.hours < 1 || noResponseRule.hours > MAX_NO_RESPONSE_HOURS
      ? t('admin:platformFees.rules.hoursRange', { max: MAX_NO_RESPONSE_HOURS })
      : noResponseRule.refundPercent + noResponseRule.expertPercent > 100
        ? t('admin:platformFees.rules.splitOver', {
            sum: noResponseRule.refundPercent + noResponseRule.expertPercent,
          })
        : null
  const dateError =
    needsDate &&
    effectiveOn !== '' &&
    effectiveOn < editing!.earliestEffectiveOn
      ? t('admin:platformFees.rules.dateTooSoon', {
          date: formatDate(editing!.earliestEffectiveOn),
        })
      : null
  const valid =
    isWhole(percent) &&
    value >= 0 &&
    value <= maxPercent &&
    lateValid &&
    noResponseValid &&
    (!needsDate ||
      (effectiveOn !== '' && effectiveOn >= editing!.earliestEffectiveOn))

  const failed = (e: unknown) =>
    setToast(
      errorToast(
        e instanceof ApiError && isSaveError(e.code)
          ? t(`admin:platformFees.errors.${e.code}`, {
              days: editing?.noticeDays,
              max: maxPercent,
              maxHours:
                e.code === 'NO_RESPONSE_RULE_INVALID'
                  ? MAX_NO_RESPONSE_HOURS
                  : MAX_LATE_HOURS,
            })
          : t('admin:platformFees.errors.failed')
      )
    )
  const open = (row: PlatformFee) => {
    setReviewing(false)
    setEditing(row)
    setPercent(String(row.percent ?? DEFAULT_PERCENT))
    setLate(toDraft(row.late ?? DEFAULT_LATE))
    setNoResponse(toNoResponseDraft(row.noResponse ?? DEFAULT_NO_RESPONSE))
    setEffectiveOn(row.percent == null ? '' : row.earliestEffectiveOn)
  }
  const confirm = () => {
    if (!editing || !valid) return
    save
      .mutateAsync({
        serviceCode: editing.serviceCode,
        percent: value,
        late: lateRule,
        noResponse: noResponseRule,
        effectiveOn: needsDate ? effectiveOn : null,
      })
      .then(() => {
        setToast(t('admin:platformFees.saved', { name: editing.serviceName }))
        setEditing(null)
      })
      .catch((e: unknown) => {
        setReviewing(false)
        failed(e)
      })
  }
  const lateExpertShare =
    isWhole(percent) && isWhole(late.penaltyPercent)
      ? Math.max(0, 100 - value - lateRule.penaltyPercent)
      : null
  const lateShareText =
    lateExpertShare == null
      ? undefined
      : t('admin:platformFees.rules.expertKeepsLate', {
          percent: lateExpertShare,
        })
  const changed = editing
    ? {
        percent: editing.percent !== value,
        late: lateText(editing.late) !== lateText(lateRule),
        noResponse:
          noResponseText(editing.noResponse) !== noResponseText(noResponseRule),
      }
    : { percent: false, late: false, noResponse: false }
  const changedCount = Object.values(changed).filter(Boolean).length
  function lateText(rule: LateRule | null | undefined) {
    return rule ? t('admin:platformFees.lateValue', { ...rule }) : '—'
  }
  function noResponseText(rule: NoResponseRule | null | undefined) {
    return rule
      ? t('admin:platformFees.noResponseValue', {
          ...rule,
          platformPercent: 100 - rule.refundPercent - rule.expertPercent,
        })
      : '—'
  }
  const withdraw = (row: PlatformFee) =>
    cancel
      .mutateAsync(row.serviceCode)
      .then(() =>
        setToast(t('admin:platformFees.cancelled', { name: row.serviceName }))
      )
      .catch(failed)
      .finally(() => setWithdrawing(null))

  return (
    <AdminLayout
      {...nav}
      section="platformFees"
      breadcrumb={t('admin:navigation.platformFees')}
    >
      <PageHeader
        title={t('admin:platformFees.title')}
        help={t('admin:platformFees.description')}
        helpLabel={t('admin:platformFees.helpLabel')}
      />

      <section className="paper mt-8 overflow-x-auto">
        <table className="w-full min-w-260 text-sm">
          <caption className="sr-only">{t('admin:platformFees.title')}</caption>
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold [&>th]:whitespace-nowrap">
              <th scope="col">{t('admin:platformFees.service')}</th>
              <th scope="col">{t('admin:platformFees.percent')}</th>
              <th scope="col">{t('admin:platformFees.late')}</th>
              <th scope="col">{t('admin:platformFees.noResponse')}</th>
              <th scope="col">{t('admin:platformFees.effectiveFrom')}</th>
              <th scope="col">{t('admin:platformFees.pending')}</th>
              <th scope="col">
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
                  <div className="text-fg-muted mt-0.5 font-mono text-xs">
                    {row.serviceCode}
                  </div>
                </td>
                <td className="num text-fg-strong text-base font-semibold">
                  {row.percent == null ? (
                    <span className="text-warning">
                      {t('admin:platformFees.notSet')}
                    </span>
                  ) : (
                    `${row.percent}%`
                  )}
                </td>
                <td className="num">
                  {row.late ? (
                    <Clauses
                      text={t('admin:platformFees.lateValue', { ...row.late })}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="num">
                  {row.noResponse ? (
                    <Clauses
                      text={t('admin:platformFees.noResponseValue', {
                        ...row.noResponse,
                        platformPercent:
                          100 -
                          row.noResponse.refundPercent -
                          row.noResponse.expertPercent,
                      })}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="num whitespace-nowrap">
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
                      className="btn btn-press btn-secondary mr-2 h-9 px-3 text-sm"
                      disabled={cancel.isPending}
                      onClick={() => setWithdrawing(row)}
                    >
                      {t('admin:platformFees.cancelPending')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-press btn-secondary h-9 px-3 text-sm"
                    onClick={() => open(row)}
                  >
                    {row.percent == null
                      ? t('admin:platformFees.set')
                      : t('admin:platformFees.change')}
                  </button>
                </td>
              </tr>
            ))}
            {query.isLoading && <SkeletonRows cols={7} />}
            {!query.isLoading && rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={7}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {query.error ? <LoadError /> : t('admin:platformFees.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editing && (
        <Modal
          title={t('admin:platformFees.dialog', { name: editing.serviceName })}
          titleAddon={
            <HelpTip label={t('admin:platformFees.helpLabel')}>
              {needsDate
                ? t('admin:platformFees.dialogHelp')
                : t('admin:platformFees.firstFeeHelp')}
            </HelpTip>
          }
          onClose={() => setEditing(null)}
          preventClose={save.isPending}
          onSubmit={() => (reviewing ? confirm() : valid && setReviewing(true))}
          footer={
            reviewing ? (
              <>
                <button
                  type="button"
                  autoFocus
                  disabled={save.isPending}
                  onClick={() => setReviewing(false)}
                  className="btn btn-press btn-secondary"
                >
                  {t('admin:platformFees.backToEdit')}
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="btn btn-press btn-primary"
                >
                  {t('admin:platformFees.confirmSave')}
                </button>
              </>
            ) : (
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
                  disabled={!valid}
                  className="btn btn-press btn-primary"
                >
                  {t('admin:platformFees.review')}
                </button>
              </>
            )
          }
        >
          {reviewing ? (
            <table className="mt-4 w-full text-sm">
              <caption className="text-fg-strong mb-2 text-left font-semibold">
                {t('admin:platformFees.reviewTitle')}
                <span className="text-fg-muted ml-2 font-normal">
                  {t('admin:platformFees.reviewChanged', {
                    count: changedCount,
                  })}
                </span>
              </caption>
              <thead className="text-fg-muted">
                <tr className="[&>th]:py-1 [&>th]:pr-4 [&>th]:text-left [&>th]:font-semibold">
                  <th scope="col">
                    <span className="sr-only">
                      {t('admin:platformFees.reviewItem')}
                    </span>
                  </th>
                  <th scope="col">{t('admin:platformFees.reviewBefore')}</th>
                  <th scope="col">{t('admin:platformFees.reviewAfter')}</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-border-subtle [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&>tr]:border-t">
                <tr
                  className={
                    changed.percent ? 'bg-accent-soft' : 'text-fg-muted'
                  }
                >
                  <th scope="row">{t('admin:platformFees.percent')}</th>
                  <td className="num">
                    {editing.percent == null ? '—' : `${editing.percent}%`}
                  </td>
                  <td className="num text-fg-strong font-semibold">{`${value}%`}</td>
                </tr>
                <tr
                  className={changed.late ? 'bg-accent-soft' : 'text-fg-muted'}
                >
                  <th scope="row">{t('admin:platformFees.late')}</th>
                  <td className="num">
                    <Clauses text={lateText(editing.late)} />
                  </td>
                  <td className="num text-fg-strong">
                    <Clauses text={lateText(lateRule)} />
                    {lateShareText && (
                      <p className="text-fg-muted mt-1">{lateShareText}</p>
                    )}
                  </td>
                </tr>
                <tr
                  className={
                    changed.noResponse ? 'bg-accent-soft' : 'text-fg-muted'
                  }
                >
                  <th scope="row">{t('admin:platformFees.noResponse')}</th>
                  <td className="num">
                    <Clauses text={noResponseText(editing.noResponse)} />
                  </td>
                  <td className="num text-fg-strong">
                    <Clauses text={noResponseText(noResponseRule)} />
                  </td>
                </tr>
                <tr className="bg-accent-soft">
                  <th scope="row">
                    {t('admin:platformFees.effectiveOnLabel')}
                  </th>
                  <td>—</td>
                  <td className="num text-fg-strong font-semibold">
                    {needsDate
                      ? formatDate(effectiveOn)
                      : t('admin:platformFees.reviewNow')}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <>
              <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
                {t('admin:platformFees.percentLabel', { max: maxPercent })}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  aria-invalid={!!percentError}
                  aria-describedby={
                    percentError ? 'fee-percent-error' : undefined
                  }
                  className="border-border-control rounded-control shadow-control bg-paper aria-[invalid=true]:border-danger border px-3 py-2 text-base font-normal"
                />
                {percentError && (
                  <span
                    id="fee-percent-error"
                    className="text-danger font-normal"
                  >
                    {percentError}
                  </span>
                )}
              </label>
              <RuleFields
                legend={t('admin:platformFees.late')}
                help={t('admin:platformFees.lateHelp', {
                  maxHours: MAX_LATE_HOURS,
                })}
                fields={LATE_FIELDS}
                label={(field) => t(`admin:platformFees.lateFields.${field}`)}
                draft={late}
                onChange={(field, text) =>
                  setLate((d) => ({ ...d, [field]: text }))
                }
                error={lateError}
                note={lateShareText}
              />
              <RuleFields
                legend={t('admin:platformFees.noResponse')}
                help={t('admin:platformFees.noResponseHelp', {
                  maxHours: MAX_NO_RESPONSE_HOURS,
                })}
                fields={NO_RESPONSE_FIELDS}
                label={(field) =>
                  t(`admin:platformFees.noResponseFields.${field}`)
                }
                draft={noResponse}
                onChange={(field, text) =>
                  setNoResponse((d) => ({ ...d, [field]: text }))
                }
                error={noResponseError}
                note={t('admin:platformFees.rules.platformKeeps', {
                  percent: Math.max(
                    0,
                    100 -
                      noResponseRule.refundPercent -
                      noResponseRule.expertPercent
                  ),
                })}
              />
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
                    aria-invalid={!!dateError}
                    aria-describedby={dateError ? 'fee-date-error' : undefined}
                    className="border-border-control rounded-control shadow-control bg-paper aria-[invalid=true]:border-danger border px-3 py-2 text-base font-normal"
                  />
                  {dateError && (
                    <span
                      id="fee-date-error"
                      className="text-danger font-normal"
                    >
                      {dateError}
                    </span>
                  )}
                </label>
              )}
              {valid &&
                editing.percent != null &&
                editing.percent !== value && (
                  <table className="mt-4 w-full text-sm">
                    <caption className="text-fg-strong mb-2 text-left font-semibold">
                      {t('admin:platformFees.example')}
                    </caption>
                    <thead className="text-fg-muted">
                      <tr className="[&>th]:py-1 [&>th]:text-left [&>th]:font-semibold">
                        <th scope="col">
                          {t('admin:platformFees.examplePrice')}
                        </th>
                        <th scope="col">
                          {t('admin:platformFees.exampleNet')}
                        </th>
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
            </>
          )}
        </Modal>
      )}
      {withdrawing?.pending && (
        <Modal
          title={t('admin:platformFees.confirmCancelTitle', {
            name: withdrawing.serviceName,
          })}
          description={t('admin:platformFees.confirmCancelBody', {
            percent: withdrawing.pending.percent,
            date: formatDate(withdrawing.pending.effectiveFrom),
            current: withdrawing.percent,
          })}
          onClose={() => setWithdrawing(null)}
          preventClose={cancel.isPending}
          footer={
            <>
              <button
                type="button"
                autoFocus
                onClick={() => setWithdrawing(null)}
                disabled={cancel.isPending}
                className="btn btn-press btn-secondary"
              >
                {t('admin:platformFees.keepPending')}
              </button>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => void withdraw(withdrawing)}
                className="btn btn-press btn-danger"
              >
                {t('admin:platformFees.cancelPending')}
              </button>
            </>
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
