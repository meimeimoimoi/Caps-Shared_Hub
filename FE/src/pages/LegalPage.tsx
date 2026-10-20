import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { BrandLogo } from '@/components/ui/display/brand-logo'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t } = useTranslation('legal')
  const title = t(`${kind}.title`)
  const sections = t(`${kind}.sections`, { returnObjects: true }) as {
    title: string
    body: string
  }[]

  useEffect(() => { document.title = `${title} | Shared Hub` }, [title])

  return (
    <div className="bg-surface text-text-strong min-h-svh px-5 text-[16px] sm:px-10">
      <header className="border-border mx-auto flex min-h-20 max-w-[1200px] flex-wrap items-center justify-between gap-4 border-b py-4 sm:min-h-24">
        <Link to="/" aria-label="Shared Hub" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-text">
          <BrandLogo className="h-10 w-[152px] sm:h-12 sm:w-[184px]" />
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-[1200px] py-7 sm:py-10">
        <Link to="/" className="text-accent-text mb-5 inline-flex min-h-11 items-center gap-2 text-[14px] underline underline-offset-4">
          <ArrowLeft size={16} aria-hidden="true" />{t('home')}
        </Link>
        <h1 className="font-serif text-[32px] leading-[1.2] text-balance sm:text-[44px]">{title}</h1>
        <p className="text-text-muted mt-4 text-[16px] leading-7 sm:text-[17px]">{t(`${kind}.intro`)}</p>
        <aside className="bg-accent-soft mt-6 rounded-lg p-5 sm:p-6" aria-label={t('draftTitle')}>
          <h2 className="text-accent-text font-semibold">{t('draftTitle')}</h2>
          <p className="mt-2 text-[15px] leading-6">{t('draftNotice')}</p>
        </aside>
        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[20px] leading-7 font-semibold sm:text-[22px]">{section.title}</h2>
              <p className="text-text-muted mt-2 text-[16px] leading-[1.75] sm:text-[17px]">{section.body}</p>
            </section>
          ))}
        </div>
        <nav className="border-border mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t pt-5 text-[15px]" aria-label={title}>
          {(['terms', 'privacy'] as const).map((page) => (
            <Link key={page} to={`/${page}`} aria-current={page === kind ? 'page' : undefined} className="text-accent-text inline-flex min-h-11 items-center underline underline-offset-4">{t(`${page}.title`)}</Link>
          ))}
        </nav>
      </main>
    </div>
  )
}
