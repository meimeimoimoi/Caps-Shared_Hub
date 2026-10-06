import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/actions/button'
import { StatusRail } from '@/components/ui/navigation/status-rail'
import { ApiError } from '@/lib/api-client'
import { useDraftHref } from '../hooks/useDrafting'

import type { Assessment } from '../types'

export function DraftButton({
  secondary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <Button
      type="button"
      {...props}
      className={`rounded-control focus-visible:ring-ink h-auto min-h-11 border px-4 py-2.5 whitespace-normal disabled:cursor-not-allowed ${secondary ? 'border-border bg-paper text-fg-strong hover:bg-sunken shadow-none' : 'border-accent bg-accent hover:bg-accent-hover text-on-accent'} ${className}`}
    />
  )
}
export function DraftLink({
  to,
  children,
  primary = false,
  className = '',
}: {
  to: string
  children: ReactNode
  primary?: boolean
  className?: string
}) {
  const href = useDraftHref()
  return (
    <Link
      to={href(to)}
      className={`${primary ? 'rounded-control bg-accent hover:bg-accent-hover text-on-accent inline-flex min-h-11 items-center justify-center px-4 py-2.5 font-medium' : 'text-accent-text inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline'} ${className}`}
    >
      {children}
    </Link>
  )
}
export function DraftHeading({
  title,
  description,
  step,
  children,
}: {
  title: string
  description?: string
  step?: number
  children?: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} | Shared Hub`
  }, [title])
  const { t } = useTranslation('drafting')

  return (
    <header className="mb-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl min-w-0">
          <h1 className="text-h1-tool md:text-h1 break-words">{title}</h1>
          {description && (
            <p className="text-fg-muted mt-2 max-w-[70ch]">{description}</p>
          )}
        </div>
        {children}
      </div>
      {step !== undefined && (
        <div className="border-border max-w-3xl border-t pt-5">
          <StatusRail
            steps={[
              'stepTemplate',
              'stepInput',
              'stepConfirm',
              'stepGenerate',
              'stepPreview',
            ].map((key) =>
              t(
                key as
                  | 'stepTemplate'
                  | 'stepInput'
                  | 'stepConfirm'
                  | 'stepGenerate'
                  | 'stepPreview'
              )
            )}
            current={step}
            size="sm"
            label={t('draftWorkflowProgress')}
          />
          <p className="text-caption text-fg-muted mt-3">
            {t(
              'aSnapshotIsAConfirmedVersionOfYourInputKeptSeparateFromTheAiDraft'
            )}
          </p>
        </div>
      )}
    </header>
  )
}
export function Paper({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-surface border-border bg-paper shadow-paper min-w-0 border p-5 md:p-8 ${className}`}
    >
      {children}
    </section>
  )
}
export function DraftLoading({ message }: { message?: string }) {
  const { t } = useTranslation('drafting')

  return (
    <div role="status" className="min-h-48 space-y-6">
      <p className="text-fg-muted">{message ?? t('loadingWorkspace')}</p>
      <div
        aria-hidden="true"
        className="bg-border h-5 w-2/3 rounded motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="rounded-surface bg-paper h-40 motion-safe:animate-pulse"
      />
    </div>
  )
}
export function DraftError({
  error,
  retry,
}: {
  error: Error | null
  retry?: () => void
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const status = error instanceof ApiError ? error.status : undefined
  return (
    <div
      role="alert"
      className="rounded-control border-danger/30 bg-danger-soft text-danger space-y-3 border p-5"
    >
      <h2 className="text-h2 !text-danger">
        {status === 403
          ? t('accessDenied')
          : status === 404
            ? t('versionOrWorkspaceUnavailable')
            : status === 401
              ? t('sessionExpired')
              : t('unableToCompleteThisAction')}
      </h2>
      <p>{display.error(error)}</p>
      <div className="flex flex-wrap gap-3">
        {retry && (
          <DraftButton secondary onClick={retry}>
            {t('retry')}
          </DraftButton>
        )}
        {status === 401 && <DraftLink to="/login">{t('signIn')}</DraftLink>}
      </div>
    </div>
  )
}
export function ReadinessBadge({ assessment }: { assessment: Assessment }) {
  const display = useDraftPresentation()

  const result =
    assessment.status === 'COMPLETED' ? assessment.result : assessment.status
  const tone =
    result === 'READY'
      ? 'bg-success-soft text-success'
      : result === 'READY_WITH_WARNINGS' || result === 'PENDING'
        ? 'bg-warning-soft text-warning'
        : 'bg-danger-soft text-danger'
  return (
    <span
      className={`rounded-control text-caption inline-flex px-2.5 py-1 font-semibold ${tone}`}
    >
      {display.readiness(result)}
    </span>
  )
}
