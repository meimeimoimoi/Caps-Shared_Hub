import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, LayoutDashboard } from 'lucide-react'
import logo from '@/assets/logo-full.png'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  useEffect(() => { document.title = `${t('notFound.title')} | Shared Hub` }, [t])
  return (
    <div className="flex min-h-svh flex-col bg-desk-2 px-[clamp(24px,5vw,80px)] text-fg-strong selection:bg-accent-soft selection:text-accent-text">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border py-4 md:min-h-[100px] md:gap-6">
        <Link to="/dashboard" className="relative block h-[34px] w-[150px] shrink-0 overflow-hidden md:h-[44px] md:w-[200px]" aria-label={t('notFound.dashboardLabel')}>
          <img src={logo} alt="Shared Hub" className="absolute top-1/2 left-1/2 h-auto w-[108%] max-w-none -translate-x-1/2 -translate-y-[50.5%]" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3"><LanguageSwitcher /><Link to="/login" className="inline-flex min-h-11 items-center gap-2 text-[14px] no-underline hover:text-accent-text">{t('actions.signIn')} <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </header>

      <main className="m-auto grid w-full max-w-[460px] flex-1 grid-cols-1 items-center gap-8 py-12 md:max-w-[1080px] md:grid-cols-2 md:gap-[clamp(48px,7vw,112px)] md:py-20">
        <div className="font-serif text-[96px] leading-none tracking-[-0.04em] text-accent-text md:pb-10 md:text-[clamp(100px,15vw,240px)]" aria-hidden="true">404<span className="mt-5 block h-[3px] w-10 bg-accent md:mt-8 md:h-1 md:w-16" /></div>
        <section aria-labelledby="not-found-title">
          <h1 id="not-found-title" className="m-0 text-[38px] leading-[1.12] tracking-[-0.03em] text-balance md:text-[clamp(36px,4vw,56px)]">{t('notFound.title')}</h1>
          <p className="mt-6 mb-8 max-w-[43ch] text-[16px] leading-[1.75] text-fg-muted">{t('notFound.description')}</p>
          <Link to="/dashboard" className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-control bg-accent px-5 py-3 text-[14px] font-semibold text-paper no-underline transition-colors duration-200 hover:bg-accent-hover active:bg-accent-active md:w-auto">
            <LayoutDashboard size={18} aria-hidden="true" /> {t('actions.dashboard')} <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <div className="mt-8 flex flex-col items-start gap-2 border-t border-border pt-6 text-[14px] md:mt-10">
            <span className="text-fg-muted">{t('notFound.joinExpert')}</span>
            <Link to="/expert/register" className="inline-flex min-h-8 items-center gap-1.5 font-semibold underline decoration-border-control underline-offset-[5px] hover:text-accent-text hover:decoration-current">{t('actions.registerExpert')} <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="flex min-h-16 items-center justify-between gap-6 border-t border-border text-[12px] text-fg-muted md:min-h-[76px]">
        <span>Shared Hub</span>
        <span>{t('notFound.footer')}</span>
      </footer>
    </div>
  )
}
