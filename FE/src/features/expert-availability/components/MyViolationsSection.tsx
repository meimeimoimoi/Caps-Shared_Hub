import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, FileText } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import type { ExcuseFile, ExpertViolation } from '@/features/expert-vetting/types'
import { getMyExcuseFile, getMyViolations, requestExcuse, violationKeys } from '../api/availabilityApi'

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
            <Row key={v.reviewCaseId} violation={v} windowDays={data.windowDays} excusesLeft={data.excusesLeft} />
          ))}
        </ul>
      )}
    </section>
  )
}

type Badge = 'excused' | 'declined' | 'pending' | 'notSent' | 'counted' | 'expired'
const BADGE_CLASS: Record<Badge, string> = {
  excused: 'bg-[var(--ep-success-bg)] text-[var(--ep-success)]',
  declined: 'bg-[var(--ep-danger-bg)] text-[var(--ep-danger)]',
  pending: 'bg-[var(--ep-warning-bg)] text-[var(--ep-warning)]',
  notSent: 'bg-[var(--ep-accent-soft)] text-[var(--ep-accent-text)]',
  counted: 'bg-[var(--ep-surface-raised)] text-[var(--ep-ink)]',
  expired: 'bg-[var(--ep-surface-raised)] text-[var(--ep-muted)]',
}

const DAY = 86_400_000

interface Step {
  label: string
  at: string | number
  /** Not reached yet: drawn hollow */
  upcoming?: boolean
}

function Row({
  violation: v,
  windowDays,
  excusesLeft,
}: {
  violation: ExpertViolation
  windowDays: number
  excusesLeft: number
}) {
  const { t } = useTranslation('expert')
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const occurred = new Date(v.occurredAt).getTime()
  const askBy = occurred + REQUEST_DAYS * DAY
  const inRequestWindow = v.counted && !v.excuseRequestedAt && Date.now() <= askBy
  // Same rule as the server: no request once the expert has used every excuse in the window
  const canAsk = inRequestWindow && excusesLeft > 0
  // Where the excuse request stands, or that the expert can still send one
  const badge: Badge = v.excusedAt
    ? 'excused'
    : v.excuseDeclinedAt
      ? 'declined'
      : v.excuseRequestedAt
        ? 'pending'
        : canAsk
          ? 'notSent'
          : v.counted
            ? 'counted'
            : 'expired'
  const code = v.reviewCaseId.slice(0, 8).toUpperCase()
  // What happened to this violation and what comes next, oldest first
  const steps = ([
    { label: t('availabilityPage.violations.timeline.occurred'), at: v.occurredAt },
    v.excuseRequestedAt
      ? { label: t('availabilityPage.violations.timeline.requested'), at: v.excuseRequestedAt }
      : canAsk
        ? { label: t('availabilityPage.violations.timeline.askBy'), at: askBy, upcoming: true }
        : null,
    v.excusedAt
      ? { label: t('availabilityPage.violations.timeline.excused'), at: v.excusedAt }
      : v.excuseDeclinedAt
        ? { label: t('availabilityPage.violations.timeline.declined'), at: v.excuseDeclinedAt }
        : null,
    v.excusedAt
      ? null
      : v.counted
        ? { label: t('availabilityPage.violations.timeline.dropsOff'), at: occurred + windowDays * DAY, upcoming: true }
        : { label: t('availabilityPage.violations.timeline.droppedOff'), at: occurred + windowDays * DAY },
  ] as (Step | null)[]).filter((step): step is Step => step !== null)

  return (
    <li className="py-4 text-sm">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="font-medium text-[var(--ep-ink)]">
            {t(`availabilityPage.violations.kind.${v.kind}`)}{' '}
            <span className="num">{t('availabilityPage.violations.plus', { count: v.points })}</span>
          </p>
          <p className="num mt-0.5 text-xs text-[var(--ep-muted)]">
            {new Date(v.occurredAt).toLocaleString('vi-VN')} ·{' '}
            {t('availabilityPage.violations.case', { id: code })}
          </p>
        </div>
        <div className="flex items-start gap-3 sm:flex-col sm:items-end">
          <span
            className={`inline-flex rounded-[5px] px-2 py-1 text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[badge]}`}
          >
            {t(`availabilityPage.violations.badge.${badge}`)}
          </span>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="btn btn-press btn-secondary whitespace-nowrap"
          >
            {open ? t('availabilityPage.violations.hide') : t('availabilityPage.violations.view')}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
      {open && (
        <div
          id={panelId}
          className="mt-3 rounded-lg border border-[var(--ep-line)] bg-[var(--ep-surface-raised)] p-4"
        >
          <ol className="space-y-3 border-l border-[var(--ep-line)] pl-4">
            {steps.map((step) => (
              <li key={step.label} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 -left-[21.5px] size-2.5 rounded-full border-2 ${
                    step.upcoming
                      ? 'border-[var(--ep-border)] bg-[var(--ep-surface-raised)]'
                      : 'border-[var(--ep-accent)] bg-[var(--ep-accent)]'
                  }`}
                />
                <p className={step.upcoming ? 'text-[var(--ep-muted)]' : 'text-[var(--ep-ink)]'}>{step.label}</p>
                <p className="num text-xs text-[var(--ep-muted)]">{new Date(step.at).toLocaleString('vi-VN')}</p>
              </li>
            ))}
          </ol>
          {v.excusedAt && v.excusedReason && (
            <p className="mt-4 break-words text-[var(--ep-ink)]">
              {t('availabilityPage.violations.excused', { reason: v.excusedReason })}
            </p>
          )}
          {v.excuseRequest && (
            <p className="mt-4 break-words whitespace-pre-wrap text-[var(--ep-ink)]">
              {t('availabilityPage.violations.yourRequest', { text: v.excuseRequest })}
            </p>
          )}
          {v.excuseFiles.length > 0 && <MyExcuseFiles reviewCaseId={v.reviewCaseId} files={v.excuseFiles} />}
          <Link
            to={`/expert/cases/${v.reviewCaseId}`}
            className="mt-4 inline-flex items-center gap-1 font-medium text-[var(--ep-accent-text)] underline-offset-2 hover:underline"
          >
            {t('availabilityPage.violations.openCase', { id: code })}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
      {canAsk && <ExcuseRequestForm reviewCaseId={v.reviewCaseId} />}
      {inRequestWindow && !canAsk && (
        <p className="mt-2 text-xs text-[var(--ep-muted)]">
          {t('availabilityPage.violations.noExcusesLeft', { days: windowDays })}
        </p>
      )}
    </li>
  )
}

/** The files the expert sent; each opens in a new tab through the API, since stored files are private */
function MyExcuseFiles({ reviewCaseId, files }: { reviewCaseId: string; files: ExcuseFile[] }) {
  const { t } = useTranslation('expert')
  const [failed, setFailed] = useState(false)
  const open = async (file: ExcuseFile) => {
    setFailed(false)
    // Open the tab first: a window opened after an await is blocked as a popup
    const tab = window.open('', '_blank')
    try {
      const url = URL.createObjectURL(await getMyExcuseFile(reviewCaseId, file.id))
      if (tab) tab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      tab?.close()
      setFailed(true)
    }
  }
  return (
    <div className="mt-1 text-xs text-[var(--ep-muted)]">
      <span>{t('availabilityPage.violations.yourFilesLabel')}</span>
      <ul className="mt-1 flex flex-wrap gap-2">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => void open(file)}
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[var(--ep-ink)]"
            >
              <FileText size={13} aria-hidden="true" />
              {file.fileName}
            </button>
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="mt-1 text-[var(--ep-danger)]">
          {t('availabilityPage.violations.fileFailed')}
        </p>
      )}
    </div>
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
          // Same box as the reason field; the native picker keeps keyboard use and the chosen file names
          className="block w-full cursor-pointer rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] p-2 text-sm text-[var(--ep-muted)] file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-solid file:border-[var(--ep-border)] file:bg-[var(--ep-surface)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--ep-ink)] hover:file:bg-[var(--ep-surface-raised)] focus-visible:outline-2 focus-visible:outline-[var(--ep-accent)]"
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
