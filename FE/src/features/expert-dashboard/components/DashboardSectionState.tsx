import { useTranslation } from 'react-i18next'
import { useExpertPresentation } from '../hooks/useExpertPresentation'
import { AlertCircle } from 'lucide-react'

export function DashboardSectionState({
  title,
  message,
  retry,
}: {
  title: string
  message: string
  retry?: () => void
}) {
  const display = useExpertPresentation()
  const { t } = useTranslation('expert')

  return (
    <div className="ep-state" role={retry ? 'alert' : undefined}>
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{display.demoCopy(message)}</p>
        {retry && (
          <button className="ep-button" onClick={retry}>
            {t('tryAgain')}
          </button>
        )}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  const { t } = useTranslation('expert')

  return (
    <div
      className="ep-dashboard-loading"
      role="status"
      aria-label={t('loadingExpertOverview')}
    >
      <div className="ep-skeleton ep-skeleton-title" />
      <div className="ep-dashboard-grid">
        <div className="ep-skeleton ep-skeleton-section" />
        <div className="ep-skeleton ep-skeleton-section" />
      </div>
      <span className="sr-only">{t('loadingExpertOverviewAlternative')}</span>
    </div>
  )
}
