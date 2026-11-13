import { AlertTriangle, RotateCw } from 'lucide-react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

/**
 * Shown where a list failed to load, so a failure never reads as "no data".
 * Retry refetches the queries on the current page.
 */
export function LoadError({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const fetching = useIsFetching() > 0

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 text-center ${className}`}
    >
      <p className="text-danger inline-flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} aria-hidden="true" />
        {t('states.loadFailed')}
      </p>
      <button
        type="button"
        disabled={fetching}
        onClick={() => void qc.refetchQueries({ type: 'active' })}
        className="btn btn-press btn-secondary h-9 px-3 text-sm"
      >
        <RotateCw
          size={14}
          aria-hidden="true"
          className={fetching ? 'motion-safe:animate-spin' : ''}
        />
        {t('actions.retry')}
      </button>
    </div>
  )
}
