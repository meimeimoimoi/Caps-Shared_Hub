import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { HomeText } from './HomeText'

export function FaqSection() {
  const { t } = useTranslation('home')
  return (
    <section className="sec light reveal" id="hoi-dap" aria-labelledby="h-faq">
      <div className="wrap faq">
        <div className="faq-head">
          <span className="label r" style={{ '--i': '0' } as CSSProperties}>
            {t('footer.faq')}
          </span>
          <h2
            id="h-faq"
            className="r"
            style={{ '--i': '1', marginTop: '18px' } as CSSProperties}
          >
            <HomeText i18nKey="faq.title" />
          </h2>
          <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
            {t('faq.lead')}
          </p>
          <Link
            className="more r"
            style={{ '--i': '3' } as CSSProperties}
            to="/ai-assistant"
          >
            {t('faq.askAi')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="faq-list r" style={{ '--i': '2' } as CSSProperties}>
          <details open>
            <summary>
              <span className="qn">01</span>
              <span className="q">{t('faq.wrong.q')}</span>
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p className="ans">
              <HomeText i18nKey="faq.wrong.a" />
            </p>
          </details>
          <details>
            <summary>
              <span className="qn">02</span>
              <span className="q">{t('faq.unfinished.q')}</span>
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p className="ans">
              <HomeText i18nKey="faq.unfinished.a" />
            </p>
          </details>
          <details>
            <summary>
              <span className="qn">03</span>
              <span className="q">{t('faq.who.q')}</span>
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p className="ans">
              <HomeText i18nKey="faq.who.a" />
            </p>
          </details>
          <details>
            <summary>
              <span className="qn">04</span>
              <span className="q">{t('faq.legal.q')}</span>
              <span className="pm" aria-hidden="true"></span>
            </summary>
            <p className="ans">
              <HomeText i18nKey="faq.legal.a" />
            </p>
          </details>
        </div>
      </div>
    </section>
  )
}
