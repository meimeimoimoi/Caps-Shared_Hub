import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'

export function HomeNavigation() {
  const { t } = useTranslation('home')
  return (
    <nav className="nav" aria-label={t('nav.label')}>
      <Link className="brand" to="/" aria-label={t('brand.home')}>
        <svg viewBox="0 0 64 72" aria-hidden="true">
          <defs>
            <linearGradient
              id="lgTop"
              x1="4"
              y1="9"
              x2="59"
              y2="42"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff7800"></stop>
              <stop offset="1" stopColor="#ff9800"></stop>
            </linearGradient>
            <linearGradient
              id="lgBot"
              x1="6"
              y1="61"
              x2="59"
              y2="34"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff8500"></stop>
              <stop offset="1" stopColor="#f0440b"></stop>
            </linearGradient>
          </defs>
          <path
            fill="url(#lgTop)"
            d="M26 4.5a12 12 0 0 1 12 0l18 10.4a12 12 0 0 1 6 10.4v6.2L38 17.6a12 12 0 0 0-12 0l-9.2 5.3a6 6 0 0 0 0 10.4L31 41.5l-9.5 5.5-13.5-7.8A12 12 0 0 1 2 28.8v-3.5a12 12 0 0 1 6-10.4L26 4.5Z"
          ></path>
          <path
            fill="url(#lgBot)"
            d="M38 67.5a12 12 0 0 1-12 0L8 57.1a12 12 0 0 1-6-10.4v-6.2L26 54.4a12 12 0 0 0 12 0l9.2-5.3a6 6 0 0 0 0-10.4L33 30.5l9.5-5.5L56 32.8a12 12 0 0 1 6 10.4v3.5a12 12 0 0 1-6 10.4L38 67.5Z"
          ></path>
        </svg>
        <span className="wordmark">
          SHARED <b>HUB</b>
        </span>
      </Link>
      <ul className="nav-links">
        <li>
          <a href="#quy-trinh">{t('footer.process')}</a>
        </li>
        <li>
          <a href="#san-pham">{t('footer.products')}</a>
        </li>
        <li>
          <a href="#an-tam">{t('nav.escrow')}</a>
        </li>
        <li>
          <a href="#hoi-dap">{t('footer.faq')}</a>
        </li>
      </ul>
      <div className="nav-actions">
        <LanguageSwitcher variant="overlay" />
        <Link className="nav-login" to="/login">
          {t('footer.login')}
        </Link>
        <Link
          className="btn btn-primary"
          to="/ai-assistant"
          aria-label={t('nav.askAi')}
        >
          <span className="lg">{t('faq.askAi')}</span>
          <span className="sm" aria-hidden="true">
            {t('process.ask.title')}
          </span>
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </nav>
  )
}
