import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/actions/button'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import {
  useQualificationOverview,
  useRegisterForService,
  type QualificationStatus,
} from '@/features/expert-qualifications'

const STATUS_CLASS: Record<QualificationStatus, string> = {
  COMPETENCY_REVIEW: 'ep-status-neutral',
  NEED_MORE_INFORMATION: 'ep-status-paused',
  PENDING_FINAL_APPROVAL: 'ep-status-neutral',
  APPROVED_FOR_SERVICE: 'ep-status-ready',
  SUSPENDED: 'ep-status-paused',
  FAIL: 'ep-status-danger',
}

const REGISTER_ERRORS = [
  'ELIGIBILITY_REQUIRED',
  'QUALIFICATION_EXISTS',
  'REAPPLY_TOO_EARLY',
  'SERVICE_NOT_FOUND',
] as const
type RegisterError = (typeof REGISTER_ERRORS)[number]
const isRegisterError = (code?: string): code is RegisterError =>
  (REGISTER_ERRORS as readonly (string | undefined)[]).includes(code)

/** Gate 2 entry: after Gate 1 the expert registers each service for competency review */
export default function ExpertQualificationsPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const navigate = useNavigate()
  const overview = useQualificationOverview()
  const register = useRegisterForService()
  const [error, setError] = useState<string | null>(null)
  const data = overview.data
  const date = (at: string) =>
    display.timestamp(at, 'Asia/Ho_Chi_Minh', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const start = (serviceCode: string) => {
    setError(null)
    register.mutate(serviceCode, {
      onSuccess: (q) => void navigate(`/expert/qualifications/${q.id}`),
      onError: (e) =>
        setError(
          e instanceof ApiError && isRegisterError(e.code)
            ? t(`qualifications.errors.${e.code}`)
            : t('qualifications.errors.failed')
        ),
    })
  }

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{t('qualifications.title')}</h1>
          <p>{t('qualifications.description')}</p>
        </div>
      </div>

      {overview.isLoading && (
        <p className="mt-6 text-sm text-[var(--ep-muted)]">
          {t('qualifications.loading')}
        </p>
      )}
      {overview.error && (
        <p role="alert" className="mt-6 text-sm text-[var(--ep-danger)]">
          {t('qualifications.errors.loadFailed')}
        </p>
      )}

      {data && !data.eligible && (
        <div className="mt-6 flex gap-3 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-4 text-sm">
          <Info size={18} aria-hidden="true" className="shrink-0" />
          <div>
            <p>{t('qualifications.eligibilityRequired')}</p>
            <Link
              to="/expert/application"
              className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-[var(--ep-accent-text)]"
            >
              {t('qualifications.openApplication')}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-[var(--ep-danger-bg)] p-3 text-sm text-[var(--ep-danger)]"
        >
          {error}
        </p>
      )}

      {data && (
        <ul className="mt-6 space-y-3">
          {data.services.map((s) => (
            <li
              key={s.serviceCode}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ep-ink)]">
                  {s.serviceName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--ep-muted)]">
                  {s.status ? (
                    <span className={`ep-status ${STATUS_CLASS[s.status]}`}>
                      {display.qualification(s.status)}
                    </span>
                  ) : (
                    <span>{t('qualifications.notRegistered')}</span>
                  )}
                  {s.submittedAt && (
                    <span>
                      {t('qualifications.submittedAt', {
                        date: date(s.submittedAt),
                      })}
                    </span>
                  )}
                  {s.earliestReapplyAt && !s.canRegister && (
                    <span>
                      {t('qualifications.reapplyFrom', {
                        date: date(s.earliestReapplyAt),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.qualificationId && (
                  <Link
                    to={`/expert/qualifications/${s.qualificationId}`}
                    className="btn btn-press btn-secondary inline-flex min-h-11 items-center no-underline"
                  >
                    {t('qualifications.view')}
                  </Link>
                )}
                {s.canRegister && (
                  <Button
                    className="min-h-11"
                    disabled={register.isPending}
                    onClick={() => start(s.serviceCode)}
                  >
                    {s.status
                      ? t('qualifications.registerAgain')
                      : t('qualifications.register')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
