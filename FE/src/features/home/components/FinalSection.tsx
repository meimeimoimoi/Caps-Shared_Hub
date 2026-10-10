import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { HomeText } from './HomeText'

export function FinalSection() {
  const { t } = useTranslation('home')
  return (
    <section
      className="sec final reveal"
      id="bat-dau"
      aria-labelledby="h-final"
    >
      <div className="glow" aria-hidden="true"></div>
      <div className="wrap">
        <h2 id="h-final" className="r" style={{ '--i': '0' } as CSSProperties}>
          <HomeText i18nKey="final.title" />
        </h2>
        <div className="cta-row r" style={{ '--i': '1' } as CSSProperties}>
          <Link className="btn btn-primary" to="/register">
            {t('final.cta')}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
        <p className="expert r" style={{ '--i': '2' } as CSSProperties}>
          {t('final.expert')}{' '}
          <Link to="/expert/register">{t('footer.expertSignup')}</Link>
        </p>
      </div>
      <div className="final-visual" id="finalVisual" aria-hidden="true">
        <div className="plane" id="finalBg">
          <div className="sheet">
            <div className="sheet-lines">
              <i style={{ width: '46%', height: '16px' } as CSSProperties}></i>
              <i
                style={{ width: '28%', marginBottom: '34px' } as CSSProperties}
              ></i>
              <i style={{ width: '88%' } as CSSProperties}></i>
              <i style={{ width: '94%' } as CSSProperties}></i>
              <i style={{ width: '81%' } as CSSProperties}></i>
              <i style={{ width: '90%' } as CSSProperties}></i>
              <i style={{ width: '58%' } as CSSProperties}></i>
              <i
                style={{ width: '86%', marginTop: '22px' } as CSSProperties}
              ></i>
              <i style={{ width: '72%' } as CSSProperties}></i>
              <i style={{ width: '40%' } as CSSProperties}></i>
            </div>
            <svg className="sheet-seal" viewBox="0 0 300 300">
              <defs>
                <filter id="ink2" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency=".9"
                    numOctaves="2"
                    seed="11"
                    result="n"
                  ></feTurbulence>
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="n"
                    scale="5"
                  ></feDisplacementMap>
                  <feComponentTransfer>
                    <feFuncA type="table" tableValues="0 .55 .9 .95"></feFuncA>
                  </feComponentTransfer>
                </filter>
              </defs>
              <g filter="url(#ink2)" fill="none" stroke="#e2600c">
                <circle cx="150" cy="150" r="136" strokeWidth="9"></circle>
                <circle cx="150" cy="150" r="116" strokeWidth="3"></circle>
                <path d="M84 118 H216 M84 190 H216" strokeWidth="3"></path>
                <text
                  x="150"
                  y="168"
                  textAnchor="middle"
                  fontSize="34"
                  fontWeight="700"
                  fill="#e2600c"
                  stroke="none"
                  letterSpacing="1"
                >
                  {t('seal.verified')}
                </text>
                <text
                  x="150"
                  y="222"
                  textAnchor="middle"
                  fontSize="19"
                  fill="#e2600c"
                  stroke="none"
                  letterSpacing="5"
                >
                  SHARED HUB
                </text>
                <text
                  x="150"
                  y="102"
                  textAnchor="middle"
                  fontSize="17"
                  fill="#e2600c"
                  stroke="none"
                  letterSpacing="4"
                >
                  {t('seal.version')}
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
