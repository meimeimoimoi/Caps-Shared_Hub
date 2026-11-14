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
const lateDrifts = (rule: LateRule) =>
  rule.penaltyPercent !== DEFAULT_LATE.penaltyPercent
const silenceDrifts = (rule: NoResponseRule) =>
  rule.refundPercent !== DEFAULT_NO_RESPONSE.refundPercent ||
  rule.expertPercent !== DEFAULT_NO_RESPONSE.expertPercent
// The API saves the three terms together; the UI edits one at a time and resends the others unchanged
type Scope = 'all' | 'percent' | 'late' | 'noResponse'

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

interface ScenarioItem {
  label: string
  parts: string[]
  /** Shown under the split, e.g. that this case does not follow the fee */
  note?: string
}

/** Each case on its own line: when it applies, then who gets what share of the price */
function Scenarios({ items }: { items: ScenarioItem[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-fg-muted">{item.label}</dt>
          <dd className="num text-fg-strong">
            {item.parts.join(' · ')}
            {item.note && (
              <span className="text-fg-muted block font-sans text-xs">
                {item.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

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
  summary,
  open = false,
  restore,
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
  /** The rule in one line, shown while the section is closed */
  summary: string
  /** The dialog edits only this rule: no fold, the title already names it */
  open?: boolean
  /** Put the agreed values back; shown only when the draft differs from them */
  restore?: { label: string; onClick: () => void }
}) {
  const errorId = useId()
  const { t } = useTranslation('common')
  const fieldset = (
    <fieldset className={open ? 'mt-4' : 'mt-2'}>
      <legend className="flex items-center gap-2 text-sm font-semibold">
        <span className={open ? undefined : 'sr-only'}>{legend}</span>
        <HelpTip label={t('helpFor', { topic: legend })}>{help}</HelpTip>
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
              aria-describedby={error ? errorId : undefined}
              className={`border-border-control rounded-control shadow-control bg-paper border px-3 py-2 text-base font-normal ${error ? 'border-danger' : ''}`}
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
      {restore && (
        <button
          type="button"
          onClick={restore.onClick}
          className="text-accent-text mt-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {restore.label}
        </button>
      )}
    </fieldset>
  )
  if (open) return fieldset
  return (
    <details
      className="motion-details border-border-subtle mt-4 border-t pt-3"
      open={!!error || undefined}
    >
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
        <span className="text-fg-strong font-semibold whitespace-nowrap">
          {legend}
        </span>
        {/* The whole rule stays readable while closed: it wraps, never truncates */}
        <span className="text-fg-muted min-w-0 flex-1">{summary}</span>
      </summary>
      {fieldset}
    </details>
  )
}

/** The platform's percent of each service; experts set their own prices on top of it */
export default function AdminPlatformFeesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const format = useFormatters()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PlatformFee | null>(null)
  const [scope, setScope] = useState<Scope>('all')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const shows = (part: Exclude<Scope, 'all'>) => scope === 'all' || scope === part
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
  // A failed save is shown inside the dialog, next to what the admin is fixing
  const [saveError, setSaveError] = useState<string | null>(null)
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

  const errorText = (e: unknown) =>
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
  const failed = (e: unknown) => setToast(errorToast(errorText(e)))
  const open = (row: PlatformFee, part: Scope = 'all') => {
    setReviewing(false)
    setSaveError(null)
    setEditing(row)
    setScope(row.percent == null ? 'all' : part)
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
        setSaveError(errorText(e))
      })
  }
  // Server rule: late within the penalty hours refunds the penalty percent, later refunds all,
  // and past the cancel hours an undelivered request is cancelled. Equal hours drop the middle step.
  function lateTimeline(rule: LateRule) {
    return [
      t('admin:platformFees.lateSteps.penalty', {
        hours: rule.penaltyHours,
        percent: rule.penaltyPercent,
      }),
      rule.cancelHours > rule.penaltyHours &&
        t('admin:platformFees.lateSteps.full', {
          from: rule.penaltyHours,
          to: rule.cancelHours,
        }),
      t('admin:platformFees.lateSteps.cancel', { hours: rule.cancelHours }),
    ]
      .filter(Boolean)
      .join(' · ')
  }
  // Server rules: on time the expert gets price minus fee; late within the penalty window the
  // refund comes out of the expert's share; later (before cancel) the client gets everything back
  function scenarios(
    fee: number,
    lateRule: LateRule,
    silence: NoResponseRule
  ): ScenarioItem[] {
    const split = (client: number, expert: number, platform: number) =>
      [
        client > 0 && t('admin:platformFees.parts.client', { percent: client }),
        t('admin:platformFees.parts.expert', { percent: expert }),
        t('admin:platformFees.parts.platform', { percent: platform }),
      ].filter(Boolean) as string[]
    return [
      {
        label: t('admin:platformFees.cases.onTime'),
        parts: split(0, 100 - fee, fee),
      },
      {
        label: t('admin:platformFees.cases.late', {
          hours: lateRule.penaltyHours,
        }),
        parts: split(
          lateRule.penaltyPercent,
          Math.max(0, 100 - fee - lateRule.penaltyPercent),
          fee
        ),
      },
      ...(lateRule.cancelHours > lateRule.penaltyHours
        ? [
            {
              label: t('admin:platformFees.cases.lateMore', {
                from: lateRule.penaltyHours,
                to: lateRule.cancelHours,
              }),
              parts: [t('admin:platformFees.parts.client', { percent: 100 })],
            },
          ]
        : []),
      {
        label: t('admin:platformFees.cases.cancel', {
          hours: lateRule.cancelHours,
        }),
        parts: [t('admin:platformFees.parts.cancelled')],
      },
      {
        label: t('admin:platformFees.cases.silence', { hours: silence.hours }),
        parts: split(
          silence.refundPercent,
          silence.expertPercent,
          100 - silence.refundPercent - silence.expertPercent
        ),
        // Its three percents are set on their own; say so when the platform share differs from the fee
        note:
          100 - silence.refundPercent - silence.expertPercent !== fee
            ? t('admin:platformFees.cases.silenceIndependent')
            : undefined,
      },
    ]
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
  // Closing with typed changes asks first, the same as leaving the policy page
  const askClose = () =>
    editing?.percent != null && changedCount > 0
      ? setConfirmDiscard(true)
      : setEditing(null)
  // A service that already has a fee needs at least one changed term before review
  const unchanged = editing?.percent != null && changedCount === 0
  function lateText(rule: LateRule | null | undefined) {
    return rule ? lateTimeline(rule) : '—'
  }
  function noResponseText(rule: NoResponseRule | null | undefined) {
    return rule
      ? t('admin:platformFees.noResponseValue', {
          ...rule,
          platformPercent: 100 - rule.refundPercent - rule.expertPercent,
        })
      : '—'
  }
  const partLabel = (part: Exclude<Scope, 'all'>) =>
    t(
      part === 'percent'
        ? 'admin:platformFees.percent'
        : part === 'late'
          ? 'admin:platformFees.late'
          : 'admin:platformFees.noResponse'
    )
  // One small action per term, named for screen readers by term and service
  const editButton = (row: PlatformFee, part: Exclude<Scope, 'all'>) => (
    <button
      key={part}
      type="button"
      onClick={() => open(row, part)}
      aria-label={`${t(`admin:platformFees.editButtons.${part}`)} · ${row.serviceName}`}
      className="btn btn-press btn-secondary h-9 justify-start px-3 text-sm"
    >
      {t(`admin:platformFees.editButtons.${part}`)}
    </button>
  )
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
        <table className="stack-table w-full text-sm md:min-w-200">
          <caption className="sr-only">{t('admin:platformFees.title')}</caption>
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:align-bottom [&>th]:font-semibold">
              <th scope="col">{t('admin:platformFees.service')}</th>
              <th scope="col">{t('admin:platformFees.percent')}</th>
              <th scope="col">{t('admin:platformFees.splitColumn')}</th>
              <th scope="col">{t('admin:platformFees.effectiveFrom')}</th>
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
                className="border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-4"
              >
                <td>
                  <div
                    className="text-fg-strong font-semibold"
                    title={row.serviceCode}
                  >
                    {row.serviceName}
                  </div>
                </td>
                <td data-label={t('admin:platformFees.percent')}>
                  {row.percent == null ? (
                    <span className="text-warning font-semibold">
                      {t('admin:platformFees.notSet')}
                    </span>
                  ) : (
                    <>
                      <span className="num text-fg-strong text-h2 font-semibold">
                        {`${row.percent}%`}
                      </span>
                      <span className="text-fg-muted block text-xs">
                        {row.percent === DEFAULT_PERCENT
                          ? t('admin:platformFees.isDefault')
                          : t('admin:platformFees.defaultIs', {
                              percent: DEFAULT_PERCENT,
                            })}
                      </span>
                      <span className="text-fg-muted mt-1 block text-xs">
                        {t('admin:platformFees.expertShareShort', {
                          percent: 100 - row.percent,
                        })}
                      </span>
                    </>
                  )}
                </td>
                <td data-label={t('admin:platformFees.splitColumn')}>
                  {row.percent == null || !row.late || !row.noResponse ? (
                    '—'
                  ) : (
                    <Scenarios
                      items={scenarios(row.percent, row.late, row.noResponse)}
                    />
                  )}
                  {row.late && lateDrifts(row.late) && (
                    <span className="text-warning mt-2 block text-xs font-semibold">
                      {t('admin:platformFees.agreed.late', {
                        percent: DEFAULT_LATE.penaltyPercent,
                      })}
                    </span>
                  )}
                  {row.noResponse && silenceDrifts(row.noResponse) && (
                    <span className="text-warning mt-2 block text-xs font-semibold">
                      {t('admin:platformFees.agreed.silence', {
                        refund: DEFAULT_NO_RESPONSE.refundPercent,
                        expert: DEFAULT_NO_RESPONSE.expertPercent,
                      })}
                    </span>
                  )}
                </td>
                <td data-label={t('admin:platformFees.effectiveFrom')}>
                  <span className="num whitespace-nowrap">
                    {row.effectiveFrom ? formatDate(row.effectiveFrom) : '—'}
                  </span>
                  {row.pending && (
                    <span className="bg-accent-soft text-accent-text rounded-control mt-2 block px-2 py-1 text-xs font-semibold">
                      {t('admin:platformFees.pendingValue', {
                        percent: row.pending.percent,
                        date: formatDate(row.pending.effectiveFrom),
                      })}
                    </span>
                  )}
                </td>
                <td className="md:w-56">
                  <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
                    {row.percent == null ? (
                      <button
                        type="button"
                        className="btn btn-press btn-primary h-9 px-3 text-sm"
                        onClick={() => open(row)}
                        aria-label={t('admin:platformFees.setFor', {
                          name: row.serviceName,
                        })}
                      >
                        {t('admin:platformFees.set')}
                      </button>
                    ) : (
                      (['percent', 'late', 'noResponse'] as const).map(
                        (part) => editButton(row, part)
                      )
                    )}
                    {row.pending && (
                      <button
                        type="button"
                        className="btn btn-press btn-ghost h-9 px-3 text-sm"
                        disabled={cancel.isPending}
                        onClick={() => setWithdrawing(row)}
                        aria-label={t('admin:platformFees.cancelFor', {
                          name: row.serviceName,
                        })}
                      >
                        {t('admin:platformFees.cancelPending')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {query.isLoading && <SkeletonRows cols={5} />}
            {!query.isLoading && rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={5}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {query.error ? (
                    <LoadError error={query.error} />
                  ) : (
                    t('admin:platformFees.empty')
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editing && (
        <Modal
          title={
            scope === 'late' || scope === 'noResponse'
              ? t('admin:platformFees.dialogPart', {
                  part: partLabel(scope),
                  name: editing.serviceName,
                })
              : t('admin:platformFees.dialog', { name: editing.serviceName })
          }
          titleAddon={
            <HelpTip label={t('admin:platformFees.helpLabel')}>
              {needsDate
                ? t('admin:platformFees.dialogHelp')
                : t('admin:platformFees.firstFeeHelp')}
            </HelpTip>
          }
          onClose={askClose}
          preventClose={save.isPending}
          onSubmit={() => {
            if (reviewing) return confirm()
            if (!valid || unchanged) return
            setSaveError(null)
            setReviewing(true)
          }}
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
                {unchanged && (
                  <span
                    id="fee-unchanged"
                    className="text-fg-muted mr-auto self-center text-sm"
                  >
                    {t('admin:platformFees.unchanged')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={askClose}
                  className="btn btn-press btn-secondary"
                >
                  {t('common:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!valid || unchanged}
                  aria-describedby={unchanged ? 'fee-unchanged' : undefined}
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
                {shows('percent') && (
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
                )}
                {shows('late') && (
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
                )}
                {shows('noResponse') && (
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
                )}
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
              {saveError && (
                <p
                  role="alert"
                  className="bg-danger-soft text-danger rounded-control mt-4 px-3 py-2 text-sm font-semibold"
                >
                  {saveError}
                </p>
              )}
              {shows('percent') && (
              <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
                <label htmlFor="fee-percent">
                  {t('admin:platformFees.percentLabel', { max: maxPercent })}
                </label>
                <input
                  id="fee-percent"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  aria-invalid={!!percentError}
                  aria-describedby={
                    percentError ? 'fee-percent-error' : 'fee-percent-share'
                  }
                  className="border-border-control rounded-control shadow-control bg-paper aria-[invalid=true]:border-danger border px-3 py-2 text-base font-normal"
                />
                {percentError ? (
                  <span
                    id="fee-percent-error"
                    className="text-danger font-normal"
                  >
                    {percentError}
                  </span>
                ) : (
                  isWhole(percent) && (
                    <span
                      id="fee-percent-share"
                      className="text-fg-strong font-normal"
                    >
                      {t('admin:platformFees.expertShare', {
                        percent: Math.max(0, 100 - value),
                      })}
                    </span>
                  )
                )}
                {percent !== String(DEFAULT_PERCENT) && (
                  <button
                    type="button"
                    onClick={() => setPercent(String(DEFAULT_PERCENT))}
                    className="text-accent-text self-start text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    {t('admin:platformFees.useDefault', {
                      percent: DEFAULT_PERCENT,
                    })}
                  </button>
                )}
              </div>
              )}
              {shows('late') && (
              <RuleFields
                open={scope === 'late'}
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
                summary={lateValid ? lateTimeline(lateRule) : ''}
                restore={
                  isWhole(late.penaltyPercent) && lateDrifts(lateRule)
                    ? {
                        label: t('admin:platformFees.agreed.useLate', {
                          percent: DEFAULT_LATE.penaltyPercent,
                        }),
                        onClick: () =>
                          setLate((d) => ({
                            ...d,
                            penaltyPercent: String(DEFAULT_LATE.penaltyPercent),
                          })),
                      }
                    : undefined
                }
              />
              )}
              {shows('noResponse') && (
              <RuleFields
                open={scope === 'noResponse'}
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
                summary={noResponseValid ? noResponseText(noResponseRule) : ''}
                restore={
                  noResponseValid && silenceDrifts(noResponseRule)
                    ? {
                        label: t('admin:platformFees.agreed.useSilence', {
                          refund: DEFAULT_NO_RESPONSE.refundPercent,
                          expert: DEFAULT_NO_RESPONSE.expertPercent,
                        }),
                        onClick: () =>
                          setNoResponse((d) => ({
                            ...d,
                            refundPercent: String(DEFAULT_NO_RESPONSE.refundPercent),
                            expertPercent: String(DEFAULT_NO_RESPONSE.expertPercent),
                          })),
                      }
                    : undefined
                }
                note={t('admin:platformFees.rules.platformKeeps', {
                  percent: Math.max(
                    0,
                    100 -
                      noResponseRule.refundPercent -
                      noResponseRule.expertPercent
                  ),
                })}
              />
              )}
              {needsDate && (
                <div className="border-border-subtle mt-4 flex flex-col gap-2 border-t pt-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <label htmlFor="fee-effective-on">
                      {t('admin:platformFees.effectiveOnLabel')}
                    </label>
                    <HelpTip
                      label={t('common:helpFor', {
                        topic: t('admin:platformFees.effectiveOnLabel'),
                      })}
                    >
                      {t('admin:platformFees.effectiveOnHelp', {
                        days: editing.noticeDays,
                        date: formatDate(editing.earliestEffectiveOn),
                      })}
                    </HelpTip>
                  </span>
                  <input
                    id="fee-effective-on"
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
                </div>
              )}
              {/* Every case recomputed from the values being typed, so a change shows its effect on money */}
              {(valid ||
                (editing.percent != null &&
                  editing.late &&
                  editing.noResponse)) && (
                <section
                  aria-labelledby="fee-preview"
                  className="border-border-subtle mt-4 border-t pt-3"
                >
                  <h3
                    id="fee-preview"
                    aria-live="polite"
                    className="text-fg-strong mb-2 text-sm font-semibold"
                  >
                    {valid
                      ? t('admin:platformFees.cases.preview')
                      : t('admin:platformFees.cases.previewStale')}
                  </h3>
                  <div className={valid ? undefined : 'opacity-60'}>
                    <Scenarios
                      items={
                        valid
                          ? scenarios(value, lateRule, noResponseRule)
                          : scenarios(
                              editing.percent!,
                              editing.late!,
                              editing.noResponse!
                            )
                      }
                    />
                  </div>
                </section>
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
      {confirmDiscard && (
        <Modal
          title={t('admin:platformFees.discardTitle')}
          description={t('admin:platformFees.discardBody')}
          onClose={() => setConfirmDiscard(false)}
          footer={
            <>
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmDiscard(false)}
                className="btn btn-press btn-secondary"
              >
                {t('admin:platformFees.keepEditing')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false)
                  setEditing(null)
                }}
                className="btn btn-press btn-danger"
              >
                {t('admin:platformFees.discard')}
              </button>
            </>
          }
        />
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
