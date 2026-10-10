import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HomeText } from './HomeText'

export function HomeFooter() {
  const { t } = useTranslation('home')
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Link className="brand" to="/" aria-label={t('brand.home')}>
              <svg viewBox="0 0 64 72" aria-hidden="true">
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
            <p>
              <HomeText i18nKey="footer.tagline" />
            </p>
          </div>
          <nav className="foot-col" aria-label={t('footer.products')}>
            <h3>{t('footer.products')}</h3>
            <ul>
              <li>
                <Link to="/ai-assistant">{t('footer.lookup')}</Link>
              </li>
              <li>
                <Link to="/drafts">{t('footer.workspace')}</Link>
              </li>
              <li>
                <a href="#san-pham">{t('footer.experts')}</a>
              </li>
            </ul>
          </nav>
          <nav className="foot-col" aria-label={t('footer.learn')}>
            <h3>{t('footer.learn')}</h3>
            <ul>
              <li>
                <a href="#quy-trinh">{t('footer.process')}</a>
              </li>
              <li>
                <a href="#an-tam">{t('footer.escrow')}</a>
              </li>
              <li>
                <a href="#hoi-dap">{t('footer.faq')}</a>
              </li>
            </ul>
          </nav>
          <nav className="foot-col" aria-label={t('footer.account')}>
            <h3>{t('footer.account')}</h3>
            <ul>
              <li>
                <Link to="/login">{t('footer.login')}</Link>
              </li>
              <li>
                <Link to="/expert/register">{t('footer.expertSignup')}</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="foot-note" role="note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v5M12 16.5v.01"></path>
          </svg>
          <p>
            <HomeText i18nKey="footer.disclaimer" />
          </p>
        </div>
        <div className="foot-bottom">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  )
}
