import { useCallback, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useAuthStore } from '@/features/auth'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  getExpertPolicy,
  getExpertPolicyHistory,
  updateExpertPolicy,
  type PolicySetting,
  type PolicySettingKey,
} from '../../features/expert-vetting/api/policyApi'
import { formatDateTime } from '../../features/expert-vetting/utils/applications'

const SAVE_ERRORS = [
  'POLICY_SETTING_OUT_OF_RANGE',
  'POLICY_REASON_REQUIRED',
  'POLICY_REASON_TOO_LONG',
  'UNKNOWN_POLICY_SETTING',
  'POLICY_EXPECTED_VALUE_REQUIRED',
  'POLICY_CHANGED',
] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)

/** Expert policy values a System Admin changes without a restart; every change keeps its reason (BR-E29) */
export default function AdminExpertPolicyPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [drafts, setDrafts] = useState<Partial<Record<PolicySettingKey, string>>>({})
  const [reason, setReason] = useState('')
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
  const valueOf = (s: PolicySetting) => drafts[s.key] ?? String(s.value)
  const invalid = (s: PolicySetting) => {
    const raw = valueOf(s)
    const n = Number(raw)
    return raw.trim() === '' || !Number.isInteger(n) || n < s.minValue || n > s.maxValue
  }
  const changed = settings.filter((s) => !invalid(s) && Number(valueOf(s)) !== s.value)
  const hasInvalid = settings.some(invalid)
  const canSave = changed.length > 0 && !hasInvalid && !!reason.trim() && !save.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    const values = Object.fromEntries(changed.map((s) => [s.key, Number(valueOf(s))]))
    // The values as read, so the server refuses the save if someone else changed them meanwhile
    const expected = Object.fromEntries(changed.map((s) => [s.key, s.value]))
    save
      .mutateAsync({ values, expected, reason })
      .then(() => {
        setDrafts({})
        setReason('')
        setToast(t('admin:expertPolicy.saved'))
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === 'POLICY_CHANGED') {
          // Show the other admin's values; the reason being typed is kept for the next try
          setDrafts({})
          void qc.invalidateQueries({ queryKey: policyKey })
          void qc.invalidateQueries({ queryKey: historyKey })
        }
        setToast(
          err instanceof ApiError && isSaveError(err.code)
            ? t(`admin:expertPolicy.errors.${err.code}`)
            : t('admin:expertPolicy.errors.failed')
        )
      })
  }

  const actor = (id: string | null) =>
    !id ? '' : id === userId ? t('admin:expertPolicy.you') : id.slice(0, 8)

  return (
    <AdminLayout {...nav} section="expertPolicy" breadcrumb={t('admin:navigation.expertPolicy')}>
      <div className="flex items-center gap-2">
        <h1 className="text-h1">{t('admin:expertPolicy.title')}</h1>
        <HelpTip label={t('admin:expertPolicy.helpLabel')}>{t('admin:expertPolicy.help')}</HelpTip>
      </div>

      <form onSubmit={submit} className="paper mt-10 p-5 md:p-6">
        {policy.isLoading && <p className="text-fg-muted">{t('common:loading')}</p>}
        {policy.error && <p className="text-danger">{policy.error.message}</p>}
        <div className="grid gap-6 md:grid-cols-3">
          {settings.map((s) => (
            <div key={s.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor={`policy-${s.key}`} className="text-sm font-semibold">
                  {t(`admin:expertPolicy.settings.${s.key}.label`)}
                </label>
                <HelpTip label={t(`admin:expertPolicy.settings.${s.key}.label`)}>
                  {t(`admin:expertPolicy.settings.${s.key}.help`, {
                    defaultValue: s.defaultValue,
                    min: s.minValue,
                    max: s.maxValue,
                  })}
                </HelpTip>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`policy-${s.key}`}
                  type="number"
                  inputMode="numeric"
                  min={s.minValue}
                  max={s.maxValue}
                  step={1}
                  value={valueOf(s)}
                  aria-invalid={invalid(s)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                  className="border-border-control rounded-control shadow-control bg-paper num w-28 border px-3 py-2"
                />
                <span className="text-fg-muted text-sm">{t(`admin:expertPolicy.settings.${s.key}.unit`)}</span>
              </div>
              {invalid(s) && (
                <p className="text-danger text-sm">
                  {t('admin:expertPolicy.outOfRange', { min: s.minValue, max: s.maxValue })}
                </p>
              )}
              <p className="text-fg-muted text-sm">
                {s.updatedAt
                  ? t('admin:expertPolicy.updated', { time: formatDateTime(s.updatedAt), actor: actor(s.updatedByUserId) })
                  : t('admin:expertPolicy.usingDefault')}
              </p>
            </div>
          ))}
        </div>

        <label className="mt-6 flex flex-col gap-2 text-sm font-semibold">
          {t('admin:expertPolicy.reason')}
          <textarea
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin:expertPolicy.reasonPlaceholder')}
            className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={!canSave} className="btn btn-press btn-primary">
            {t('admin:expertPolicy.save')}
          </button>
        </div>
      </form>

      <h2 className="text-h2 mt-12">{t('admin:expertPolicy.historyTitle')}</h2>
      <section className="paper mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
              <th>{t('admin:expertPolicy.history.time')}</th>
              <th>{t('admin:expertPolicy.history.setting')}</th>
              <th>{t('admin:expertPolicy.history.change')}</th>
              <th>{t('admin:expertPolicy.history.actor')}</th>
              <th>{t('admin:expertPolicy.history.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {(history.data ?? []).map((c) => (
              <tr key={c.id} className="border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3">
                <td className="num whitespace-nowrap">{formatDateTime(c.changedAt)}</td>
                <td>{t(`admin:expertPolicy.settings.${c.key}.label`)}</td>
                <td className="num whitespace-nowrap">
                  {c.oldValue} → <span className="text-fg-strong font-semibold">{c.newValue}</span>
                </td>
                <td>{actor(c.changedByUserId)}</td>
                <td className="max-w-sm whitespace-pre-line">{c.reason}</td>
              </tr>
            ))}
            {!history.data?.length && (
              <tr className="border-border-subtle border-t">
                <td colSpan={5} className="text-fg-muted px-4 py-10 text-center">
                  {history.isLoading
                    ? t('common:loading')
                    : (history.error?.message ?? t('admin:expertPolicy.history.empty'))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
