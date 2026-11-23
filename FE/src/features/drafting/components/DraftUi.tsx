import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/actions/button'
import { Check } from 'lucide-react'
import { useMotion } from '@/components/ui/motion'
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
const DRAFT_STEPS = [
  'stepTemplate',
  'stepInput',
  'stepConfirm',
  'stepGenerate',
  'stepPreview',
] as const

/* Thanh bước riêng cho luồng soạn thảo: thanh tiến độ chia đoạn + số bước + tên; mobile gọn thành "Bước x/5" + thanh tiến độ */
function DraftSteps({ current }: { current: number }) {
  const { t } = useTranslation('drafting')
  const total = DRAFT_STEPS.length
  return (
    <nav aria-label={t('draftWorkflowProgress')}>
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="text-sm">
          <span className="font-num text-text-muted">
            {t('stepCounter', { current: current + 1, total })}
          </span>
          <span className="text-text-muted"> · </span>
          <span className="text-text-strong font-semibold">
            {t(DRAFT_STEPS[current])}
          </span>
        </p>
        <span className="bg-sunken block h-1 overflow-hidden rounded-full">
          <span
            className="bg-accent block h-full rounded-full transition-[width] duration-300"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </span>
      </div>

      <ol className="hidden gap-2 sm:grid sm:grid-cols-5">
        {DRAFT_STEPS.map((key, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={key}
              aria-current={active ? 'step' : undefined}
              className="flex min-w-0 flex-col gap-2.5"
            >
              <span
                aria-hidden="true"
                className={`h-1 rounded-full transition-colors duration-300 ${done || active ? 'bg-accent' : 'bg-border'}`}
              />
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`font-num flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${done || active ? 'bg-accent text-on-accent' : 'border-border bg-surface text-text-muted border'}`}
                >
                  {done ? <Check size={13} aria-hidden="true" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-text-muted text-[0.6875rem] leading-tight font-medium tracking-[0.04em] uppercase">
                    {t('stepNumber', { n: index + 1 })}
                  </span>
                  <span
                    className={`truncate text-sm leading-snug ${active ? 'text-text-strong font-semibold' : done ? 'text-text' : 'text-text-muted'}`}
                  >
                    {t(key)}
                    {done && (
                      <span className="sr-only"> ({t('stepDone')})</span>
                    )}
                  </span>
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
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
        <div className="flex max-w-5xl flex-col gap-3">
          <DraftSteps current={step} />
          {/* Khái niệm snapshot chỉ cần giải thích ở bước nhập / xác nhận dữ liệu */}
          {(step === 1 || step === 2) && (
            <p className="text-caption text-fg-muted">
              {t(
                'aSnapshotIsAConfirmedVersionOfYourInputKeptSeparateFromTheAiDraft'
              )}
            </p>
          )}
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
  const motion = useMotion<HTMLElement>({ preset: 'panel', viewport: true })
  return (
    <section
      ref={motion}
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
