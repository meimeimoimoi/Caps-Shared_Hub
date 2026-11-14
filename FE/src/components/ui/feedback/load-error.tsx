import { AlertTriangle, RotateCw } from 'lucide-react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { isMissingEndpoint } from '@/lib/api-client'

/**
 * Shown where a list failed to load, so a failure never reads as "no data".
 * Retry refetches the queries on the current page. Pass the error when known: a missing
 * endpoint (404/501) says the feature is not on the server yet instead of blaming the network.
 */
export function LoadError({
  className = '',
  error,
}: {
  className?: string
  error?: unknown
}) {
  const { t } = useTranslation('common')
  const qc = useQueryClient()
  const fetching = useIsFetching() > 0
  const missing = isMissingEndpoint(error)

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 text-center ${className}`}
    >
      <p
        className={`inline-flex items-center gap-2 font-semibold ${missing ? 'text-fg-strong' : 'text-danger'}`}
      >
        <AlertTriangle size={16} aria-hidden="true" />
        {missing ? t('states.notAvailable') : t('states.loadFailed')}
      </p>
      {!missing && (
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
      )}
    </div>
  )
}
