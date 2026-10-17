import { useTranslation } from 'react-i18next'

export function HomeBackToTop() {
  const { t } = useTranslation('home')
  return (
    <button className="to-top" id="toTop" type="button" aria-label={t('toTop')}>
      <svg className="to-top-ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="24"></circle>
        <circle className="fill" cx="26" cy="26" r="24" pathLength="1"></circle>
      </svg>
      <svg
        className="to-top-arrow"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"></path>
      </svg>
    </button>
  )
}
