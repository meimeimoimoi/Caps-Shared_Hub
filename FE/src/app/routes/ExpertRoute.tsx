import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useAuthStore } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import '../layouts/expert/expert-theme.css'

export function ExpertRoute() {
  const display = useExpertPresentation()
  const { t } = useTranslation('expert')

  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const path = location.pathname
  const title = path.endsWith('/pricing')
    ? t('pricing.title')
    : path.includes('/settings')
      ? t('settings')
      : path.endsWith('/overview')
        ? t('overview')
        : path.endsWith('/queue')
          ? t('workQueue')
          : path.endsWith('/active')
            ? t('activeCasesAlternative')
            : path.endsWith('/services')
              ? t('services')
              : path.endsWith('/income')
                ? t('income')
                : path.endsWith('/cases')
                  ? t('cases')
                  : t('caseDetails')
  useEffect(() => {
    document.title = `${title} | Shared Hub`
  }, [title])
  const context = useExpertContext()
  const { logout } = useAuth()
  if (!authenticated && !isExpertDemo)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  const denied =
    context.error instanceof ApiError && context.error.status === 403
  if (context.isPending)
    return (
      <div className="expert-portal ep-access">
        <div role="status">
          <div className="ep-skeleton ep-skeleton-section" />
          <p>{t('checkingExpertPortalAccess')}</p>
        </div>
      </div>
    )
  if (context.isError || !context.data?.portalAccess.allowed)
    return (
      <div className="expert-portal ep-access">
        <div>
          <h1>
            {denied || context.data?.portalAccess.allowed === false
              ? t('expertPortalAccessUnavailable')
              : t('unableToVerifyAccess')}
          </h1>
          <p>
            {denied
              ? t('theServerHasDeniedAccessToTheExpertPortalForThisAccount')
              : context.isError
                ? t(
                    'yourAccessCouldNotBeCheckedRetryToReconnectYourPermissionsHaveNotBeenDetermined'
                  )
                : context.data?.portalAccess.reason
                  ? display.demoCopy(context.data.portalAccess.reason)
                  : t(
                      'thisAccountIsNotPermittedToEnterTheOperationalExpertPortal'
                    )}
          </p>
          <div className="ep-access-actions">
            <button
              className="ep-button"
              onClick={() => void context.refetch()}
              disabled={context.isFetching}
            >
              {t('retryAccessCheck')}
            </button>
            {authenticated && (
              <button className="ep-button" onClick={logout}>
                {t('signOut')}
              </button>
            )}
            <Link className="ep-link" to="/dashboard">
              {t('backToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    )
  return <Outlet />
}
