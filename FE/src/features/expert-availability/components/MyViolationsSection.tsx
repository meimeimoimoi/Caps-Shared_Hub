import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import type { ExpertViolation } from '@/features/expert-vetting/types'
import { getMyViolations, requestExcuse, violationKeys } from '../api/availabilityApi'

/* Rules of 2026-11-20: points count 90 days; 6 hide the expert, 9 suspend every service.
 * Force majeure: ask here within 2 days of the violation and email the evidence to the admin. */
const REQUEST_DAYS = 2
// Same rule as the server (ApplicationRules): PDF, JPEG or PNG, 10 MB each, at most 5
const MAX_FILES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPT = 'application/pdf,image/jpeg,image/png'

export function MyViolationsSection() {
  const { t } = useTranslation('expert')
  const { data } = useQuery({ queryKey: violationKeys.all, queryFn: ({ signal }) => getMyViolations(signal) })
  if (!data) return null

  return (
    <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-semibold text-[var(--ep-ink)]">
          {t('availabilityPage.violations.title')}
          <HelpTip label={t('availabilityPage.violations.title')}>
            {t('availabilityPage.violations.help', { days: data.windowDays })}
          </HelpTip>
        </h2>
        <p className="num text-sm font-semibold text-[var(--ep-ink)]">
          {t('availabilityPage.violations.points', { count: data.points, days: data.windowDays })}
        </p>
      </div>
      {data.items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--ep-muted)]">{t('availabilityPage.violations.none')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--ep-line)]">
          {data.items.map((v) => (
            <Row key={v.reviewCaseId} violation={v} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Row({ violation: v }: { violation: ExpertViolation }) {
  const { t } = useTranslation('expert')
  const canAsk =
    v.counted &&
    !v.excuseRequestedAt &&
    Date.now() <= new Date(v.occurredAt).getTime() + REQUEST_DAYS * 86_400_000
  const status = v.excusedAt
    ? t('availabilityPage.violations.excused', { reason: v.excusedReason })
    : v.excuseDeclinedAt
      ? t('availabilityPage.violations.declined')
      : v.excuseRequestedAt
        ? t('availabilityPage.violations.pending')
        : v.counted
          ? t('availabilityPage.violations.counted')
          : t('availabilityPage.violations.expired')

  return (
    <li className="py-3 text-sm">
      <p className="font-medium text-[var(--ep-ink)]">
        {t(`availabilityPage.violations.kind.${v.kind}`)}{' '}
        <span className="num">{t('availabilityPage.violations.plus', { count: v.points })}</span>
      </p>
      <p className="num mt-0.5 text-xs text-[var(--ep-muted)]">
        {new Date(v.occurredAt).toLocaleString('vi-VN')} ·{' '}
        {t('availabilityPage.violations.case', { id: v.reviewCaseId.slice(0, 8).toUpperCase() })} · {status}
      </p>
      {v.excuseRequest && (
        <p className="mt-1 break-words whitespace-pre-wrap text-[var(--ep-ink)]">
          {t('availabilityPage.violations.yourRequest', { text: v.excuseRequest })}
        </p>
      )}
      {v.excuseFiles.length > 0 && (
        <p className="mt-1 text-xs text-[var(--ep-muted)]">
          {t('availabilityPage.violations.yourFiles', {
            names: v.excuseFiles.map((f) => f.fileName).join(', '),
          })}
        </p>
      )}
      {canAsk && <ExcuseRequestForm reviewCaseId={v.reviewCaseId} />}
    </li>
  )
}

function ExcuseRequestForm({ reviewCaseId }: { reviewCaseId: string }) {
  const { t } = useTranslation('expert')
  const qc = useQueryClient()
  const id = useId()
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      qc.setQueryData(violationKeys.all, await requestExcuse(reviewCaseId, reason.trim(), files))
    } catch (err) {
      // The app's missing-key handler ignores defaultValue, so check the key first
      const key = `availabilityPage.violations.errors.${err instanceof ApiError ? err.code : ''}`
      setError(
        i18n.exists(key, { ns: 'expert' })
          ? (i18n.t(key as never, { ns: 'expert' }) as string)
          : t('availabilityPage.violations.failed')
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mt-2">
      <summary className="cursor-pointer font-semibold text-[var(--ep-accent)]">
        {t('availabilityPage.violations.ask')}
      </summary>
      <form onSubmit={(e) => void submit(e)} className="mt-2 space-y-2">
        <label htmlFor={id} className="block font-semibold text-[var(--ep-ink)]">
          {t('availabilityPage.violations.reason')}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3 py-2"
        />
        <label htmlFor={`${id}-files`} className="block font-semibold text-[var(--ep-ink)]">
          {t('availabilityPage.violations.files')}
        </label>
        <input
          id={`${id}-files`}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])]
            // Catch the obvious mistakes here; the server checks the real file type from its bytes
            setError(
              picked.length > MAX_FILES
                ? t('availabilityPage.violations.errors.VIOLATION_EXCUSE_FILE_LIMIT')
                : picked.some((f) => f.size > MAX_FILE_BYTES)
                  ? t('availabilityPage.violations.errors.EVIDENCE_TOO_LARGE')
                  : null
            )
            setFiles(picked.length > MAX_FILES || picked.some((f) => f.size > MAX_FILE_BYTES) ? [] : picked)
          }}
          className="block w-full text-sm"
        />
        <p className="text-xs text-[var(--ep-muted)]">{t('availabilityPage.violations.evidence')}</p>
        {error && (
          <p role="alert" className="text-[var(--ep-danger)]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !reason.trim()}
          className="btn btn-press btn-secondary disabled:opacity-60"
        >
          {t('availabilityPage.violations.send')}
        </button>
      </form>
    </details>
  )
}
