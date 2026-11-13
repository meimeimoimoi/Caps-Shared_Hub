import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useAuthStore } from '@/features/auth'
import {
  ClipboardCheck,
  Hourglass,
  RotateCcw,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  getExpertPolicy,
  getExpertPolicyHistory,
  updateExpertPolicy,
  type PolicySetting,
  type PolicySettingKey,
} from '../../features/expert-vetting/api/policyApi'
import { formatDateTime } from '../../features/expert-vetting/utils/applications'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'

const SAVE_ERRORS = [
  'POLICY_SETTING_OUT_OF_RANGE',
  'POLICY_REASON_REQUIRED',
  'POLICY_REASON_TOO_LONG',
  'UNKNOWN_POLICY_SETTING',
  'POLICY_EXPECTED_VALUE_REQUIRED',
  'POLICY_CHANGED',
  'POLICY_RANGE_INVERTED',
] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)

/** A tile is one setting, or a min/max pair edited side by side and checked against each other */
type Row =
  | { single: PolicySettingKey }
  | {
      range: 'fee' | 'turnaround'
      min: PolicySettingKey
      max: PolicySettingKey
    }

type Group = { id: 'review' | 'reapply' | 'pricing'; rows: Row[] }

const GROUPS: Group[] = [
  {
    id: 'review',
    rows: [
      { single: 'MinYearsExperience' },
      { single: 'MaxInformationRequests' },
      { single: 'ReviewClaimHours' },
      { single: 'ReviewSlaDays' },
      { single: 'FinalApprovalDays' },
    ],
  },
  {
    id: 'reapply',
    rows: [
      { single: 'ReapplyNotEligibleDays' },
      { single: 'ReapplyCompetencyFailDays' },
    ],
  },
  {
    id: 'pricing',
    rows: [
      { range: 'fee', min: 'PricingMinFee', max: 'PricingMaxFee' },
      {
        range: 'turnaround',
        min: 'TurnaroundMinDays',
        max: 'TurnaroundMaxDays',
      },
      { single: 'PriceChangeWarningPercent' },
      { single: 'PlatformFeeNoticeDays' },
    ],
  },
]

const MONEY_KEYS: PolicySettingKey[] = ['PricingMinFee', 'PricingMaxFee']

/** Each group gets its own tone and icon so the three blocks of the table are told apart at a glance */
const GROUP_TONE: Record<
  Group['id'],
  { icon: LucideIcon; header: string; badge: string; edge: string }
> = {
  review: {
    icon: ClipboardCheck,
    header: 'bg-info-soft text-info',
    badge: 'bg-info text-paper',
    edge: '[&>td:first-child]:border-l-info',
  },
  reapply: {
    icon: Hourglass,
    header: 'bg-warning-soft text-warning',
    badge: 'bg-warning text-paper',
    edge: '[&>td:first-child]:border-l-warning',
  },
  pricing: {
    icon: Wallet,
    header: 'bg-success-soft text-success',
    badge: 'bg-success text-paper',
    edge: '[&>td:first-child]:border-l-success',
  },
}

const chip =
  'num inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'

/** Expert policy values a System Admin changes without a restart; every change keeps its reason (BR-E29).
 * Settings are edited as tiles, reviewed and confirmed in a modal, and the change log sits at the bottom. */
export default function AdminExpertPolicyPage() {
  const nav = useAdminNav()
  const { t, i18n } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [drafts, setDrafts] = useState<
    Partial<Record<PolicySettingKey, string>>
  >({})
  const [focused, setFocused] = useState<PolicySettingKey | null>(null)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const policyKey = [...adminKeys.all, 'expert-policy'] as const
  const historyKey = [...adminKeys.all, 'expert-policy-history'] as const
  const policy = useQuery({
    queryKey: policyKey,
    queryFn: ({ signal }) => getExpertPolicy(signal),
  })
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => getExpertPolicyHistory(signal),
  })
  const save = useMutation({
    mutationFn: (input: {
      values: Partial<Record<PolicySettingKey, number>>
      expected: Partial<Record<PolicySettingKey, number>>
      reason: string
    }) => updateExpertPolicy(input.values, input.expected, input.reason),
    onSuccess: async (settings) => {
      qc.setQueryData(policyKey, settings)
      await qc.invalidateQueries({ queryKey: historyKey })
    },
  })

  const settings = policy.data ?? []
  const byKey = new Map(settings.map((s) => [s.key, s]))
  const numberFormat = new Intl.NumberFormat(i18n.language)
  const show = (key: PolicySettingKey, n: number) =>
    MONEY_KEYS.includes(key) ? numberFormat.format(n) : String(n)
  const unit = (key: PolicySettingKey) =>
    t(`admin:expertPolicy.settings.${key}.unit`)
  const label = (key: PolicySettingKey) =>
    t(`admin:expertPolicy.settings.${key}.label`)

  const valueOf = (s: PolicySetting) => drafts[s.key] ?? String(s.value)
  const outOfRange = (s: PolicySetting) => {
    const raw = valueOf(s)
    const n = Number(raw)
    return (
      raw.trim() === '' ||
      !Number.isInteger(n) ||
      n < s.minValue ||
      n > s.maxValue
    )
  }
  const inverted = (row: Row) => {
    if (!('range' in row)) return false
    const lo = byKey.get(row.min)
    const hi = byKey.get(row.max)
    if (!lo || !hi || outOfRange(lo) || outOfRange(hi)) return false
    return Number(valueOf(lo)) > Number(valueOf(hi))
  }
  const rows = GROUPS.flatMap((g) => g.rows)
  const isDirty = (s: PolicySetting) =>
    drafts[s.key] !== undefined && valueOf(s) !== String(s.value)
  const changed = settings.filter(
    (s) => !outOfRange(s) && Number(valueOf(s)) !== s.value
  )
  const pending = settings.filter(isDirty)
  const hasInvalid = settings.some(outOfRange) || rows.some(inverted)
  const canReview = changed.length > 0 && !hasInvalid
  const canSave = canReview && !!reason.trim() && !save.isPending

  const setDraft = (key: PolicySettingKey, raw: string) =>
    // Digits only: grouping separators shown while not editing must not reach the value
    setDrafts((d) => ({ ...d, [key]: raw.replace(/\D/g, '') }))
  const discard = () => {
    setDrafts({})
    setReason('')
  }
  const closeConfirm = () => {
    if (save.isPending) return
    setConfirming(false)
    setSaveError(null)
  }

  const submit = () => {
    if (!canSave) return
    setSaveError(null)
    const values = Object.fromEntries(
      changed.map((s) => [s.key, Number(valueOf(s))])
    )
    // The values as read, so the server refuses the save if someone else changed them meanwhile
    const expected = Object.fromEntries(changed.map((s) => [s.key, s.value]))
    save
      .mutateAsync({ values, expected, reason })
      .then(() => {
        setDrafts({})
        setReason('')
        setConfirming(false)
        setToast(t('admin:expertPolicy.saved'))
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError && isSaveError(err.code)
            ? t(`admin:expertPolicy.errors.${err.code}`)
            : t('admin:expertPolicy.errors.failed')
        if (err instanceof ApiError && err.code === 'POLICY_CHANGED') {
          // Show the other admin's values; the reason being typed is kept for the next try
          setDrafts({})
          setConfirming(false)
          setToast(message)
          void qc.invalidateQueries({ queryKey: policyKey })
          void qc.invalidateQueries({ queryKey: historyKey })
          return
        }
        setSaveError(message)
      })
  }

  const actor = (id: string | null) =>
    !id ? '' : id === userId ? t('admin:expertPolicy.you') : id.slice(0, 8)

  const field = (s: PolicySetting, ariaLabel?: string) => {
    const bad = outOfRange(s)
    const raw = valueOf(s)
    const display =
      focused === s.key || bad || raw === '' ? raw : show(s.key, Number(raw))
    const money = MONEY_KEYS.includes(s.key)
    return (
      <div
        className={cn(
          'rounded-control bg-paper flex h-9 shrink-0 items-center border transition-colors',
          'focus-within:border-accent focus-within:ring-accent-soft focus-within:ring-2',
          bad
            ? 'border-danger'
            : isDirty(s)
              ? 'border-accent'
              : 'border-border-control'
        )}
      >
        <input
          id={`policy-${s.key}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-invalid={bad}
          aria-describedby={bad ? `policy-${s.key}-error` : undefined}
          value={display}
          onFocus={() => setFocused(s.key)}
          onBlur={() => setFocused(null)}
          onChange={(e) => setDraft(s.key, e.target.value)}
          className={cn(
            'num text-fg-strong h-full bg-transparent pl-3 text-right font-semibold outline-none',
            money ? 'w-28' : 'w-14'
          )}
        />
        <span className="text-fg-muted pr-3 pl-1.5 text-sm">{unit(s.key)}</span>
      </div>
    )
  }

  const errorFor = (s: PolicySetting) =>
    outOfRange(s) && (
      <p id={`policy-${s.key}-error`} className="text-danger text-xs">
        {t('admin:expertPolicy.outOfRange', {
          min: show(s.key, s.minValue),
          max: show(s.key, s.maxValue),
        })}
      </p>
    )

  const helpFor = (s: PolicySetting) =>
    t(`admin:expertPolicy.settings.${s.key}.help`, {
      defaultValue: show(s.key, s.defaultValue),
      min: show(s.key, s.minValue),
      max: show(s.key, s.maxValue),
    })

  /** The default value; when the input differs from it, clicking it puts the default back */
  const defaultCell = (items: PolicySetting[], text: string) => {
    const differs = items.some(
      (s) => valueOf(s) === '' || Number(valueOf(s)) !== s.defaultValue
    )
    if (!differs)
      return <span className={cn(chip, 'bg-sunken text-fg')}>{text}</span>
    return (
      <button
        type="button"
        title={t('admin:expertPolicy.resetDefault', { value: text })}
        onClick={() =>
          setDrafts((d) => ({
            ...d,
            ...Object.fromEntries(
              items.map((s) => [s.key, String(s.defaultValue)])
            ),
          }))
        }
        className={cn(
          chip,
          'bg-accent-soft text-accent-text hover:bg-accent hover:text-paper transition-colors'
        )}
      >
        <RotateCcw size={13} aria-hidden="true" />
        {text}
      </button>
    )
  }

  /** Latest edit among the settings of one row */
  const updatedCell = (items: PolicySetting[]) => {
    const last = items
      .filter((s) => s.updatedAt)
      .sort((a, b) => (a.updatedAt! < b.updatedAt! ? 1 : -1))[0]
    if (!last) return <span className="text-fg-muted">—</span>
    return (
      <span className="num inline-flex items-center gap-2">
        <span aria-hidden="true" className="bg-success size-2 rounded-full" />
        <span className="text-fg">{formatDateTime(last.updatedAt!)}</span>
        <span className={cn(chip, 'bg-accent-soft text-accent-text')}>
          {actor(last.updatedByUserId)}
        </span>
      </span>
    )
  }

  const allowedChip = (text: string) => (
    <span
      className={cn(chip, 'border-border text-fg-muted border bg-transparent')}
    >
      {text}
    </span>
  )
  const currentCell = (dirty: boolean, text: string) =>
    dirty ? (
      <span className={cn(chip, 'bg-warning-soft text-warning')}>{text}</span>
    ) : (
      <span className="text-fg-muted">—</span>
    )

  const rowClass = (dirty: boolean, g: Group) =>
    cn(
      'align-middle transition-colors hover:bg-sunken/40 [&>td]:px-5 [&>td]:py-3',
      // The group's colour runs down the first cell, tying each row to its header
      '[&>td:first-child]:border-l-4',
      GROUP_TONE[g.id].edge,
      dirty && 'bg-accent-soft/40'
    )

  const renderRow = (row: Row, g: Group) => {
    if ('single' in row) {
      const s = byKey.get(row.single)
      if (!s) return null
      const u = unit(s.key)
      return (
        <tr key={s.key} className={rowClass(isDirty(s), g)}>
          <td>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor={`policy-${s.key}`}
                className="text-fg-strong font-medium"
              >
                {label(s.key)}
              </label>
              <HelpTip label={label(s.key)}>{helpFor(s)}</HelpTip>
            </div>
          </td>
          <td>
            <div className="flex flex-col items-start gap-1">
              {field(s)}
              {errorFor(s)}
            </div>
          </td>
          <td>{currentCell(isDirty(s), `${show(s.key, s.value)} ${u}`)}</td>
          <td className="num whitespace-nowrap">
            {defaultCell([s], `${show(s.key, s.defaultValue)} ${u}`)}
          </td>
          <td>
            {allowedChip(
              `${show(s.key, s.minValue)}–${show(s.key, s.maxValue)}`
            )}
          </td>
          <td className="whitespace-nowrap">{updatedCell([s])}</td>
        </tr>
      )
    }
    const lo = byKey.get(row.min)
    const hi = byKey.get(row.max)
    if (!lo || !hi) return null
    const title = t(`admin:expertPolicy.ranges.${row.range}`)
    const dirty = isDirty(lo) || isDirty(hi)
    const u = unit(hi.key)
    return (
      <tr key={row.range} className={rowClass(dirty, g)}>
        <td>
          <div className="flex items-center gap-1.5">
            <span
              id={`policy-range-${row.range}`}
              className="text-fg-strong font-medium"
            >
              {title}
            </span>
            <HelpTip label={title}>
              {helpFor(lo)}
              <span className="mt-2 block">{helpFor(hi)}</span>
            </HelpTip>
          </div>
        </td>
        <td>
          <div
            role="group"
            aria-labelledby={`policy-range-${row.range}`}
            className="flex flex-col items-start gap-1"
          >
            <div className="flex items-center gap-2">
              {field(lo, label(lo.key))}
              <span aria-hidden="true" className="text-fg-muted">
                –
              </span>
              {field(hi, label(hi.key))}
            </div>
            {errorFor(lo)}
            {errorFor(hi)}
            {inverted(row) && (
              <p className="text-danger text-xs">
                {t('admin:expertPolicy.rangeInverted')}
              </p>
            )}
          </div>
        </td>
        <td>
          {currentCell(
            dirty,
            `${show(lo.key, lo.value)}–${show(hi.key, hi.value)} ${u}`
          )}
        </td>
        <td className="num whitespace-nowrap">
          {defaultCell(
            [lo, hi],
            `${show(lo.key, lo.defaultValue)}–${show(hi.key, hi.defaultValue)} ${u}`
          )}
        </td>
        <td>
          {allowedChip(
            `${show(lo.key, lo.minValue)}–${show(hi.key, hi.maxValue)}`
          )}
        </td>
        <td className="whitespace-nowrap">{updatedCell([lo, hi])}</td>
      </tr>
    )
  }

  return (
    <AdminLayout
      {...nav}
      section="expertPolicy"
      breadcrumb={t('admin:navigation.expertPolicy')}
    >
      <PageHeader
        title={t('admin:expertPolicy.title')}
        help={t('admin:expertPolicy.help')}
        helpLabel={t('admin:expertPolicy.helpLabel')}
      />
      {policy.isLoading && (
        <p className="text-fg-muted mt-8">{t('common:loading')}</p>
      )}
      {policy.error && <LoadError className="paper mt-8 px-4 py-10" />}

      {settings.length > 0 && (
        <div className="mt-8 flex flex-col gap-10">
          {/* One table for every group, so the columns line up from the first setting to the last */}
          <section className="paper overflow-x-auto">
            <table className="w-full min-w-240 text-sm">
              <thead className="bg-sunken text-fg-muted text-left">
                <tr className="border-border border-b [&>th]:px-5 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-wide [&>th]:whitespace-nowrap [&>th]:uppercase">
                  <th className="w-[32%]">
                    {t('admin:expertPolicy.history.setting')}
                  </th>
                  <th>{t('admin:expertPolicy.columns.value')}</th>
                  <th>{t('admin:expertPolicy.columns.current')}</th>
                  <th>{t('admin:expertPolicy.columns.default')}</th>
                  <th>{t('admin:expertPolicy.columns.allowed')}</th>
                  <th>{t('admin:expertPolicy.columns.updated')}</th>
                </tr>
              </thead>
              {GROUPS.map((g) => {
                const tone = GROUP_TONE[g.id]
                const Icon = tone.icon
                return (
                  <tbody
                    key={g.id}
                    aria-labelledby={`policy-group-${g.id}`}
                    className="divide-border-subtle divide-y"
                  >
                    <tr
                      className={cn(
                        'border-border-subtle border-y',
                        tone.header
                      )}
                    >
                      <th
                        colSpan={6}
                        scope="colgroup"
                        className="px-5 py-2.5 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-control flex size-6 items-center justify-center',
                              tone.badge
                            )}
                          >
                            <Icon size={14} aria-hidden="true" />
                          </span>
                          <span
                            id={`policy-group-${g.id}`}
                            className="text-sm font-semibold"
                          >
                            {t(`admin:expertPolicy.groups.${g.id}.title`)}
                          </span>
                          <HelpTip
                            label={t(`admin:expertPolicy.groups.${g.id}.title`)}
                          >
                            {t(`admin:expertPolicy.groups.${g.id}.help`)}
                          </HelpTip>
                        </span>
                      </th>
                    </tr>
                    {g.rows.map((r) => renderRow(r, g))}
                  </tbody>
                )
              })}
            </table>
          </section>

          {/* Shown only while editing; pinned to the viewport bottom so it is never scrolled away */}
          {pending.length > 0 && (
            <div className="bg-ink text-paper rounded-overlay shadow-overlay animate-enter sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="font-semibold">
                {t('admin:expertPolicy.pending', { count: pending.length })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={discard}
                  className="btn btn-press text-paper hover:bg-paper/10"
                >
                  {t('admin:expertPolicy.discard')}
                </button>
                <button
                  type="button"
                  disabled={!canReview}
                  onClick={() => setConfirming(true)}
                  className="btn btn-press btn-primary disabled:opacity-50"
                >
                  {t('admin:expertPolicy.review')}
                </button>
              </div>
            </div>
          )}

          <section aria-labelledby="policy-history">
            <h2 id="policy-history" className="text-h2 mb-4">
              {t('admin:expertPolicy.historyTitle')}
            </h2>
            <div className="paper overflow-x-auto">
              {history.data?.length ? (
                <table className="w-full min-w-200 text-sm">
                  <thead className="bg-sunken text-fg-muted text-left">
                    <tr className="border-border border-b [&>th]:px-5 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-wide [&>th]:whitespace-nowrap [&>th]:uppercase">
                      <th>{t('admin:expertPolicy.history.time')}</th>
                      <th>{t('admin:expertPolicy.history.setting')}</th>
                      <th className="text-right">
                        {t('admin:expertPolicy.history.change')}
                      </th>
                      <th>{t('admin:expertPolicy.history.reason')}</th>
                      <th>{t('admin:expertPolicy.history.actor')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-subtle divide-y">
                    {history.data.map((c) => (
                      <tr
                        key={c.id}
                        className="align-top [&>td]:px-5 [&>td]:py-3"
                      >
                        <td className="num text-fg-muted whitespace-nowrap">
                          {formatDateTime(c.changedAt)}
                        </td>
                        <td className="text-fg-strong font-medium">
                          {label(c.key)}
                        </td>
                        <td className="num text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={cn(
                                chip,
                                'bg-danger-soft text-danger line-through'
                              )}
                            >
                              {show(c.key, c.oldValue)}
                            </span>
                            <span aria-hidden="true" className="text-fg-muted">
                              →
                            </span>
                            <span
                              className={cn(
                                chip,
                                'bg-success-soft text-success'
                              )}
                            >
                              {show(c.key, c.newValue)} {unit(c.key)}
                            </span>
                          </span>
                        </td>
                        <td className="text-fg max-w-md whitespace-pre-line">
                          {c.reason}
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className={cn(
                              chip,
                              'bg-accent-soft text-accent-text'
                            )}
                          >
                            {actor(c.changedByUserId)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-fg-muted px-5 py-8 text-center text-sm">
                  {history.isLoading
                    ? t('common:loading')
                    : (history.error?.message ??
                      t('admin:expertPolicy.history.empty'))}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {confirming && (
        <Modal
          size="lg"
          title={t('admin:expertPolicy.confirmTitle')}
          onClose={closeConfirm}
          onSubmit={submit}
          preventClose={save.isPending}
          footer={
            <>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={save.isPending}
                className="btn btn-press btn-ghost"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={cn(
                  'btn btn-press btn-primary',
                  save.isPending && 'btn-loading'
                )}
              >
                {t('admin:expertPolicy.confirm')}
              </button>
            </>
          }
        >
          <div className="border-border-subtle rounded-control mt-5 overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-sunken text-fg-muted text-left">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                  <th>{t('admin:expertPolicy.history.setting')}</th>
                  <th className="text-right">
                    {t('admin:expertPolicy.confirmBefore')}
                  </th>
                  <th className="text-right">
                    {t('admin:expertPolicy.confirmAfter')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-subtle divide-y">
                {changed.map((s) => (
                  <tr key={s.key} className="[&>td]:px-4 [&>td]:py-2.5">
                    <td className="text-fg-strong">{label(s.key)}</td>
                    <td className="text-right">
                      <span
                        className={cn(
                          chip,
                          'bg-danger-soft text-danger line-through'
                        )}
                      >
                        {show(s.key, s.value)} {unit(s.key)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span
                        className={cn(chip, 'bg-success-soft text-success')}
                      >
                        {show(s.key, Number(valueOf(s)))} {unit(s.key)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="mt-5 flex flex-col gap-1.5">
            <span className="text-sm font-semibold">
              {t('admin:expertPolicy.reason')}
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('admin:expertPolicy.reasonPlaceholder')}
              className="border-border-control rounded-control bg-paper focus:border-accent focus:ring-accent-soft w-full resize-y border px-3 py-2 outline-none focus:ring-2"
            />
          </label>
          {saveError && (
            <p role="alert" className="text-danger mt-3 text-sm">
              {saveError}
            </p>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
