import { Button } from '@/components/ui/actions/button'
import { useAuthStore } from '@/features/auth'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useExpertContext } from '@/features/expert-context'
import { ApiError } from '@/lib/api-client'
import { AppHeader } from '@/components/ui/layout/app-header'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { t } = useTranslation('dashboard')
  useEffect(() => {
    document.title = `${t('title')} | Shared Hub`
  }, [t])
  const context = useExpertContext()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (context.isPending)
    return (
      <div className="bg-canvas min-h-svh">
        <AppHeader
          searchLinks={[{ label: t('drafts'), to: '/drafts' }]}
          context={t('title')}
          account={{ name: user?.name ?? t('user'), onSignOut: logout }}
        />
        <div className="p-8" role="status">
          {t('checking')}
        </div>
      </div>
    )
  if (!context.isError && context.data?.portalAccess.allowed)
    return <Navigate to="/expert/overview" replace />

  return (
    <div className="bg-canvas text-fg min-h-svh">
      <AppHeader
        searchLinks={[{ label: t('drafts'), to: '/drafts' }]}
        context={t('title')}
        account={{ name: user?.name ?? t('user'), onSignOut: logout }}
      />
      <main className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-fg-strong text-2xl font-bold">{t('title')}</h1>
            <p className="text-fg-muted text-sm">
              {t('welcome', {
                name: user?.name ?? t('user'),
                email: user?.email ?? '-',
              })}
            </p>
          </div>
        </div>
        <div className="border-border bg-paper text-fg rounded-xl border p-6 text-sm">
          {t('shell')}
        </div>
        <Link
          to="/drafts"
          className="bg-accent hover:bg-accent-hover inline-flex min-h-11 items-center rounded-md px-5 py-3 text-[var(--ui-on-accent)]"
        >
          {t('drafts')}
        </Link>
        {context.isError &&
          !(
            context.error instanceof ApiError && context.error.status === 403
          ) && (
            <div role="alert" className="text-fg space-y-3 text-sm">
              <p>{t('accessError')}</p>
              <Button
                variant="outline"
                onClick={() => void context.refetch()}
                disabled={context.isFetching}
              >
                {t('retry')}
              </Button>
            </div>
          )}
      </main>
    </div>
  )
}
