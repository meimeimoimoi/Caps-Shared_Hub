import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { BrandLogo } from '@/components/ui/display/brand-logo'
import { useAuth } from '@/features/auth'

/** Signed in, but the account lacks the permission for this area (same look as the 404 page). */
export default function ForbiddenPage() {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  useEffect(() => {
    document.title = `${t('forbidden.title')} | Shared Hub`
  }, [t])
  return (
    <div className="bg-desk-2 text-fg-strong flex min-h-svh flex-col px-[clamp(24px,5vw,80px)]">
      <header className="border-border flex min-h-20 items-center border-b py-4 md:min-h-[100px]">
        <Link
          to="/dashboard"
          className="block shrink-0"
          aria-label={t('notFound.dashboardLabel')}
        >
          <BrandLogo className="h-[34px] w-[150px] md:h-[44px] md:w-[200px]" />
        </Link>
      </header>
      <main className="m-auto grid w-full max-w-[460px] flex-1 grid-cols-1 items-center gap-8 py-12 md:max-w-[1080px] md:grid-cols-2 md:gap-[clamp(48px,7vw,112px)] md:py-20">
        <div
          className="text-accent-text font-serif text-[96px] leading-none tracking-[-0.04em] md:pb-10 md:text-[clamp(100px,15vw,240px)]"
          aria-hidden="true"
        >
          403
          <span className="bg-accent mt-5 block h-[3px] w-10 md:mt-8 md:h-1 md:w-16" />
        </div>
        <section aria-labelledby="forbidden-title">
          <h1
            id="forbidden-title"
            className="m-0 text-[38px] leading-[1.12] tracking-[-0.03em] text-balance md:text-[clamp(36px,4vw,56px)]"
          >
            {t('forbidden.title')}
          </h1>
          <p className="text-fg-muted mt-6 mb-8 max-w-[43ch] text-[16px] leading-[1.75]">
            {t('forbidden.description', { email: user?.email ?? '' })}
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Link
              to="/dashboard"
              className="rounded-control bg-accent text-paper hover:bg-accent-hover active:bg-accent-active inline-flex min-h-12 items-center justify-center gap-3 px-5 py-3 text-[14px] font-semibold no-underline transition-colors duration-[var(--motion-feedback)]"
            >
              <LayoutDashboard size={18} aria-hidden="true" />{' '}
              {t('actions.dashboard')}{' '}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="hover:text-accent-text inline-flex min-h-12 cursor-pointer items-center justify-center px-2 text-[14px] font-semibold underline underline-offset-[5px]"
            >
              {t('forbidden.switchAccount')}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
