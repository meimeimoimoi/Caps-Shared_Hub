import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { HomeText } from './HomeText'

export function ProcessSection() {
  const { t } = useTranslation('home')
  return (
    <section
      className="sec light reveal"
      id="quy-trinh"
      aria-labelledby="h-process"
    >
      <div className="wrap">
        <div className="process-head">
          <div>
            <span className="label r" style={{ '--i': '0' } as CSSProperties}>
              {t('footer.process')}
            </span>
            <h2
              id="h-process"
              className="r"
              style={{ '--i': '1', marginTop: '18px' } as CSSProperties}
            >
              <HomeText i18nKey="process.title" />
            </h2>
          </div>
          <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
            <HomeText i18nKey="process.lead" />
          </p>
        </div>
        <div className="track" id="track">
          <svg
            className="line"
            viewBox="0 0 1000 4"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 2 H1000" pathLength="1"></path>
            <path
              className="done"
              d="M0 2 H1000"
              pathLength="1"
              id="trackDone"
            ></path>
          </svg>
          <ol className="steps">
            <li className="step r" style={{ '--i': '3' } as CSSProperties}>
              <div className="dot">01</div>
              <div className="card">
                <div className="card-top">
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h0.5"></path>
                    <path d="M9 9.5h6M9 12h3.5"></path>
                  </svg>
                  <span className="who">{t('process.ask.who')}</span>
                </div>
                <h3>{t('process.ask.title')}</h3>
                <p>
                  <HomeText i18nKey="process.ask.desc" />
                </p>
              </div>
            </li>
            <li className="step r" style={{ '--i': '4' } as CSSProperties}>
              <div className="dot">02</div>
              <div className="card">
                <div className="card-top">
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 3.5H7.5A2.5 2.5 0 0 0 5 6v12a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V8.5z"></path>
                    <path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h4.5"></path>
                  </svg>
                  <span className="who">{t('process.draft.who')}</span>
                </div>
                <h3>{t('process.draft.title')}</h3>
                <p>
                  <HomeText i18nKey="process.draft.desc" />
                </p>
              </div>
            </li>
            <li className="step r" style={{ '--i': '5' } as CSSProperties}>
              <div className="dot">03</div>
              <div className="card">
                <div className="card-top">
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="10.5" cy="10.5" r="6"></circle>
                    <path d="m15 15 5 5M8 10.5l1.8 1.8 3.4-3.6"></path>
                  </svg>
                  <span className="who">{t('process.review.who')}</span>
                </div>
                <h3>{t('verify.reviewer')}</h3>
                <p>
                  <HomeText i18nKey="process.review.desc" />
                </p>
              </div>
            </li>
            <li className="step r" style={{ '--i': '6' } as CSSProperties}>
              <div className="dot">04</div>
              <div className="card">
                <div className="card-top">
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="10" r="6.5"></circle>
                    <path d="M9.2 10.2l1.9 1.9 3.8-4M8.5 15.5 7 21l5-2.2 5 2.2-1.5-5.5"></path>
                  </svg>
                  <span className="who">{t('process.verified.who')}</span>
                </div>
                <h3>{t('process.verified.title')}</h3>
                <p>
                  <HomeText i18nKey="process.verified.desc" />
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
