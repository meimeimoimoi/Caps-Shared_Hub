import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { HomeText } from './HomeText'

export function VerificationSection() {
  const { t } = useTranslation('home')
  return (
    <section
      className="sec stamp-sec light reveal"
      id="dong-dau"
      aria-labelledby="h-stamp"
    >
      <div className="wrap stamp-grid">
        <div className="stamp-copy">
          <span className="label r" style={{ '--i': '0' } as CSSProperties}>
            {t('verify.label')}
          </span>
          <h2
            id="h-stamp"
            className="r"
            style={{ '--i': '1' } as CSSProperties}
          >
            <HomeText i18nKey="verify.title" />
          </h2>
          <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
            <HomeText i18nKey="verify.lead" />
          </p>
          <button
            className="hold r"
            style={{ '--i': '3' } as CSSProperties}
            id="holdBtn"
            type="button"
            aria-describedby="holdHint"
          >
            <svg className="hring" viewBox="0 0 48 48" aria-hidden="true">
              <circle
                className="bg"
                cx="24"
                cy="24"
                r="20"
                fill="none"
                strokeWidth="3"
              ></circle>
              <circle
                className="fg"
                cx="24"
                cy="24"
                r="20"
                fill="none"
                strokeWidth="3"
              ></circle>
            </svg>
            <span id="holdLabel">{t('verify.hold')}</span>
          </button>
          <p
            className="hold-hint r"
            style={{ '--i': '4' } as CSSProperties}
            id="holdHint"
          >
            {t('verify.hint')}
          </p>
        </div>
        <article
          className="doc r"
          style={{ '--i': '2' } as CSSProperties}
          id="doc"
          aria-live="polite"
        >
          <div className="doc-top">
            <span className="label">{t('verify.docLabel')}</span>
            <span className="doc-ver" id="docVer">
              {t('verify.draftVersion')}
            </span>
          </div>
          <h3 className="doc-title">{t('verify.docTitle')}</h3>
          <div className="ghost" aria-hidden="true">
            <i style={{ width: '94%' } as CSSProperties}></i>
            <i style={{ width: '71%' } as CSSProperties}></i>
          </div>
          <p className="row">
            <span className="was">
              <HomeText i18nKey="verify.rowBefore" />
            </span>
            <span className="now">
              <HomeText i18nKey="verify.rowAfter" />
            </span>
          </p>
          <div className="ghost" aria-hidden="true">
            <i style={{ width: '88%' } as CSSProperties}></i>
            <i style={{ width: '52%' } as CSSProperties}></i>
          </div>
          <div className="note">
            <span className="avatar" aria-hidden="true">
              {t('verify.reviewerInitials')}
            </span>
            <div className="note-body">
              <p className="note-who">
                {t('verify.reviewer')}{' '}
                <svg className="tick" viewBox="0 0 22 22" aria-hidden="true">
                  <circle cx="11" cy="11" r="10"></circle>
                  <path d="M6.5 11.5l3 3 6-6.5"></path>
                </svg>
              </p>
              <p>
                <HomeText i18nKey="verify.note" />
              </p>
              <cite>{t('verify.citation')}</cite>
            </div>
          </div>
          <p className="doc-foot">{t('verify.example')}</p>
          <svg className="seal" viewBox="0 0 150 150" aria-hidden="true">
            <circle
              cx="75"
              cy="75"
              r="68"
              fill="none"
              stroke="#ff7a00"
              strokeWidth="4"
            ></circle>
            <circle
              cx="75"
              cy="75"
              r="58"
              fill="none"
              stroke="#ff7a00"
              strokeWidth="1.5"
            ></circle>
            <text
              x="75"
              y="82"
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#ff7a00"
              letterSpacing=".5"
            >
              {t('seal.verified')}
            </text>
            <text
              x="75"
              y="104"
              textAnchor="middle"
              fontSize="10"
              fill="#ff7a00"
              letterSpacing="2"
            >
              SHARED HUB
            </text>
            <path d="M44 56 H106" stroke="#ff7a00" strokeWidth="1.5"></path>
          </svg>
        </article>
      </div>
    </section>
  )
}
