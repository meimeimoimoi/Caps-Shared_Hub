import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/feedback/modal'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { excuseViolation, getExpertViolations } from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import type { ExpertViolation } from '../types'
import { formatDateTime } from '../utils/applications'

/* Rules of 2026-11-20: points count 90 days; 6 hide the expert, 9 suspend every approved service */
export function ExpertViolationsSection({ expertId }: { expertId: string }) {
  const { t } = useTranslation('admin')
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: adminKeys.violations(expertId),
    queryFn: ({ signal }) => getExpertViolations(expertId, signal),
  })
  const [excusing, setExcusing] = useState<ExpertViolation | null>(null)
  if (!data) return null

  return (
    <section className="border-border-subtle mt-7 border-t pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-fg-strong flex items-center gap-1.5 text-base font-semibold">
          {t('experts.violations.title')}
          <HelpTip label={t('experts.violations.title')}>
            {t('experts.violations.help', { days: data.windowDays })}
          </HelpTip>
        </h3>
        <p className="text-sm">
          <span className="text-fg-strong num font-semibold">
            {t('experts.violations.points', { count: data.points, days: data.windowDays })}
          </span>
          <span className="text-fg-muted">
            {' · '}
            {t('experts.violations.excusesLeft', { count: data.excusesLeft })}
          </span>
        </p>
      </div>
      {data.items.length === 0 ? (
        <p className="text-fg-muted mt-3 text-sm">{t('experts.violations.none')}</p>
      ) : (
        <ol className="divide-border-subtle mt-3 divide-y text-sm">
          {data.items.map((v) => (
            <li
              key={v.reviewCaseId}
              className="grid gap-2 py-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
            >
              <time dateTime={v.occurredAt} className="text-fg-muted num text-xs">
                {formatDateTime(v.occurredAt)}
              </time>
              <div className="min-w-0 wrap-anywhere">
                <p className="text-fg-strong font-semibold">
                  {t(`experts.violations.kind.${v.kind}`)}{' '}
                  <span className="num">
                    {t('experts.violations.plus', { count: v.points })}
                  </span>
                </p>
                <p className="text-fg-muted num mt-0.5 text-xs">
                  {t('experts.violations.case', { id: v.reviewCaseId.slice(0, 8).toUpperCase() })}
                  {' · '}
                  {v.excusedAt
                    ? t('experts.violations.excused', { reason: v.excusedReason })
                    : v.counted
                      ? t('experts.violations.counted')
                      : t('experts.violations.expired')}
                </p>
              </div>
              {v.counted && data.excusesLeft > 0 && (
                <button
                  type="button"
                  onClick={() => setExcusing(v)}
                  className="btn btn-press btn-secondary justify-self-start"
                >
                  {t('experts.violations.excuse')}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {excusing && (
        <ExcuseDialog
          violation={excusing}
          onConfirm={async (reason) => {
            const next = await excuseViolation(expertId, excusing.reviewCaseId, reason)
            qc.setQueryData(adminKeys.violations(expertId), next)
          }}
          onClose={() => setExcusing(null)}
        />
      )}
    </section>
  )
}

function ExcuseDialog({
  violation,
  onConfirm,
  onClose,
}: {
  violation: ExpertViolation
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation(['admin', 'common'])
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const missing = !reason.trim()

  const confirm = async () => {
    setTried(true)
    if (missing || pending) return
    setPending(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined
      // The app's missing-key handler ignores defaultValue, so check the key first
      const key = `experts.violations.errors.${code}`
      setError(
        code && i18n.exists(key, { ns: 'admin' })
          ? (i18n.t(key as never, { ns: 'admin' }) as string)
          : t('experts.violations.failed')
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      title={t('experts.violations.excuseTitle')}
      description={t('experts.violations.excuseBody', {
        kind: t(`experts.violations.kind.${violation.kind}`),
        id: violation.reviewCaseId.slice(0, 8).toUpperCase(),
      })}
      onClose={onClose}
      preventClose={pending}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-press btn-secondary"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className="btn btn-press btn-primary"
          >
            {t('experts.violations.confirm')}
          </button>
        </>
      }
    >
      <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
        {t('experts.violations.reason')}
        <textarea
          rows={3}
          maxLength={1000}
          autoFocus
          value={reason}
          aria-invalid={tried && missing}
          aria-describedby={tried && missing ? 'excuse-reason-error' : undefined}
          onChange={(e) => setReason(e.target.value)}
          className="border-border-control rounded-control shadow-control bg-paper aria-invalid:border-danger resize-y border px-3 py-2 text-base font-normal"
        />
        {tried && missing && (
          <span id="excuse-reason-error" className="text-danger font-normal">
            {t('experts.violations.reasonMissing')}
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
    </Modal>
  )
}
