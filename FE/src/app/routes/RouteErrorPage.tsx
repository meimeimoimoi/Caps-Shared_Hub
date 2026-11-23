import { useEffect, useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ArrowRight, FileWarning, RefreshCw, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import './route-error.css'

/** Eagerly loaded so a failed page chunk can still show recovery controls. */
export function RouteErrorPage() {
  const error = useRouteError()
  const { t } = useTranslation('common')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [reloading, setReloading] = useState(false)
  const missing = isRouteErrorResponse(error) && error.status === 404
  const title = offline
    ? t('routeError.offlineTitle')
    : missing
      ? t('notFound.title')
      : t('routeError.title')

  useEffect(() => {
    document.title = title + ' | Shared Hub'
  }, [title])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const reload = () => {
    setReloading(true)
    // A document reload also clears React.lazy's cached rejected import.
    window.location.reload()
  }

  return (
    <div className="route-error-page">
      <header className="route-error-header">
        <a href="/dashboard" className="route-error-brand">
          Shared Hub<span aria-hidden="true">.</span>
        </a>
        <LanguageSwitcher />
      </header>
      <main className="route-error-main" aria-labelledby="route-error-title">
        <div className="route-error-symbol" aria-hidden="true">
          {offline ? (
            <WifiOff size={64} strokeWidth={1.25} />
          ) : (
            <FileWarning size={64} strokeWidth={1.25} />
          )}
        </div>
        <section>
          <h1 id="route-error-title">{title}</h1>
          <p className="route-error-description">
            {offline
              ? t('routeError.offlineDescription')
              : missing
                ? t('notFound.description')
                : t('routeError.description')}
          </p>
          <div className="route-error-actions">
            <button
              type="button"
              onClick={reload}
              disabled={reloading}
              aria-busy={reloading}
            >
              <RefreshCw size={18} aria-hidden="true" />
              {reloading ? t('routeError.reloading') : t('routeError.reload')}
            </button>
            <a href="/dashboard">
              {t('actions.dashboard')}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <p className="route-error-help">
            {offline ? t('routeError.offlineHelp') : t('routeError.help')}
          </p>
        </section>
      </main>
      <footer className="route-error-footer">
        <span>Shared Hub</span>
        <span>{t('routeError.footer')}</span>
      </footer>
    </div>
  )
}
