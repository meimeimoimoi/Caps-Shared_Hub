import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { HomeText } from './HomeText'

export function EscrowSection() {
  const { t } = useTranslation('home')
  return (
    <section
      className="sec escrow reveal"
      id="an-tam"
      aria-labelledby="h-escrow"
    >
      <div className="wrap">
        <span
          className="label r"
          style={
            { '--i': '0', color: 'var(--text-secondary)' } as CSSProperties
          }
        >
          {t('footer.escrow')}
        </span>
        <h2
          id="h-escrow"
          className="r"
          style={{ '--i': '1', marginTop: '18px' } as CSSProperties}
        >
          <HomeText i18nKey="escrow.title" />
        </h2>
        <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
          <HomeText i18nKey="escrow.lead" />
        </p>
        <div className="flow">
          <svg
            className="links"
            viewBox="0 0 600 24"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 12 H600"></path>
            <circle
              className="pulse"
              cx="0"
              cy="12"
              r="6"
              style={{ '--run': '600px' } as CSSProperties}
            ></circle>
          </svg>
          <div className="node r" style={{ '--i': '3' } as CSSProperties}>
            <div className="disc">
              <svg
                viewBox="0 0 36 36"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="18" cy="18" r="11"></circle>
                <path d="M18 12v12M14.5 15h5a2.5 2.5 0 0 1 0 5h-3a2.5 2.5 0 0 0 0 5h5"></path>
              </svg>
            </div>
            <span className="step-no">{t('escrow.step', { n: 1 })}</span>
            <h3>{t('escrow.book.title')}</h3>
            <p>
              <HomeText i18nKey="escrow.book.desc" />
            </p>
          </div>
          <div className="node r" style={{ '--i': '4' } as CSSProperties}>
            <div className="disc">
              <svg
                viewBox="0 0 36 36"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="8" y="16" width="20" height="14" rx="2"></rect>
                <path d="M12 16v-4a6 6 0 0 1 12 0v4"></path>
              </svg>
            </div>
            <span className="step-no">{t('escrow.step', { n: 2 })}</span>
            <h3>{t('escrow.hold.title')}</h3>
            <p>
              <HomeText i18nKey="escrow.hold.desc" />
            </p>
          </div>
          <div className="node r" style={{ '--i': '5' } as CSSProperties}>
            <div className="disc">
              <svg
                viewBox="0 0 36 36"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="18" cy="18" r="11"></circle>
                <path d="M12.5 18.5l3.5 3.5 7.5-8"></path>
              </svg>
            </div>
            <span className="step-no">{t('escrow.step', { n: 3 })}</span>
            <h3>{t('escrow.accept.title')}</h3>
            <p>
              <HomeText i18nKey="escrow.accept.desc" />
            </p>
          </div>
        </div>
        <p className="escrow-note r" style={{ '--i': '6' } as CSSProperties}>
          <HomeText i18nKey="escrow.note" />
        </p>
      </div>
    </section>
  )
}
