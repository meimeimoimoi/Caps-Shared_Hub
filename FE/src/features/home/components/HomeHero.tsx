import { useTranslation } from 'react-i18next'
import type { CSSProperties, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HomeText } from './HomeText'
import { SplitHeadline } from './SplitHeadline'

export function HomeHero({
  onAskAi,
}: {
  onAskAi: (event: FormEvent<HTMLFormElement>) => void
}) {
  const { t } = useTranslation('home')
  return (
    <>
      <header className="hero" id="hero">
        <div className="stage" id="stage">
          <div className="poster" id="poster" aria-hidden="true"></div>
          <div
            className="poster poster-end"
            id="posterEnd"
            aria-hidden="true"
          ></div>
          <video
            id="heroVideo"
            preload="none"
            muted
            playsInline
            aria-hidden="true"
            tabIndex={-1}
          ></video>
          <div className="sheet-layer" id="sheetLayer" aria-hidden="true">
            <div className="sheet">
              <div className="sheet-lines">
                <i
                  style={{ width: '46%', height: '16px' } as CSSProperties}
                ></i>
                <i
                  style={
                    { width: '28%', marginBottom: '34px' } as CSSProperties
                  }
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
                  <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency=".9"
                      numOctaves="2"
                      seed="7"
                      result="n"
                    ></feTurbulence>
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="n"
                      scale="5"
                    ></feDisplacementMap>
                    <feComponentTransfer>
                      <feFuncA
                        type="table"
                        tableValues="0 .55 .9 .95"
                      ></feFuncA>
                    </feComponentTransfer>
                  </filter>
                </defs>
                <g filter="url(#ink)" fill="none" stroke="#e2600c">
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
          <div className="scrim" aria-hidden="true"></div>
          <div className="dust" aria-hidden="true">
            <i
              style={
                {
                  left: '18%',
                  top: '20%',
                  animationDelay: '-2s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '27%',
                  top: '52%',
                  animationDelay: '-9s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '71%',
                  top: '30%',
                  animationDelay: '-5s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '83%',
                  top: '62%',
                  animationDelay: '-12s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '44%',
                  top: '12%',
                  animationDelay: '-7s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '62%',
                  top: '70%',
                  animationDelay: '-3s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '9%',
                  top: '74%',
                  animationDelay: '-11s',
                } as CSSProperties
              }
            ></i>
            <i
              style={
                {
                  left: '91%',
                  top: '16%',
                  animationDelay: '-6s',
                } as CSSProperties
              }
            ></i>
          </div>
          <div
            className="band band-l b1"
            data-a="0"
            data-b="0.22"
            style={{ '--sa': '.7' } as CSSProperties}
          >
            <span className="label">{t('hero.eyebrow')}</span>
            <SplitHeadline as="h1" text={t('hero.ask1')} mode="words" />
            <form className="ask" id="askForm" onSubmit={onAskAi}>
              <label className="sr-only" htmlFor="askInput">
                {t('hero.ask.label')}
              </label>
              <input
                id="askInput"
                type="text"
                autoComplete="off"
                placeholder={t('hero.ask.placeholder')}
                maxLength={2000}
              />
              <button className="btn btn-primary" type="submit">
                {t('process.ask.title')}
              </button>
            </form>
            <p className="ask-note">{t('hero.ask.note')}</p>
          </div>
          <div
            className="band band-r b2"
            data-a="0.27"
            data-b="0.48"
            data-spread="0.5"
            style={{ '--sa': '.64' } as CSSProperties}
          >
            <SplitHeadline as="h2" text={t('hero.draft')} mode="chars" />
            <p className="sub">
              <HomeText i18nKey="hero.draftSub" />
            </p>
          </div>
          <div
            className="band band-l b3"
            data-a="0.53"
            data-b="0.74"
            style={{ '--sa': '.64' } as CSSProperties}
          >
            <h2 className="stack">
              <span className="sr-only">
                {t('hero.review').replace(/<[^>]+>/g, '')}
              </span>
              <span className="soft" aria-hidden="true">
                <HomeText i18nKey="hero.review" />
              </span>
              <span className="sharp" aria-hidden="true">
                <HomeText i18nKey="hero.review" />
              </span>
            </h2>
            <p className="sub">
              <HomeText i18nKey="hero.reviewSub" />
            </p>
          </div>
          <div
            className="band band-c b4"
            data-a="0.80"
            data-b="1"
            data-ramp="0.06"
            style={{ '--sa': '.62' } as CSSProperties}
          >
            <SplitHeadline as="h2" text={t('hero.verified')} mode="words" />
            <p className="sub">
              <HomeText i18nKey="hero.verifiedSub" />
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to="/register">
                {t('final.cta')}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
          <svg className="ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".25"
              strokeWidth="3"
            ></circle>
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="126"
              style={{ strokeDashoffset: 'var(--ld,126)' } as CSSProperties}
              transform="rotate(-90 24 24)"
            ></circle>
          </svg>
          <div className="cue" aria-hidden="true">
            {t('hero.cue')}
            <span></span>
          </div>
        </div>
      </header>
      <header className="hero-static" id="heroStatic">
        <div className="inner">
          <span className="label">{t('hero.eyebrow')}</span>
          <h1>
            <HomeText i18nKey="hero.staticTitle" />
          </h1>
          <p className="sub">
            <HomeText i18nKey="hero.staticSub" />
          </p>
          <form className="ask" id="askFormStatic" onSubmit={onAskAi}>
            <label className="sr-only" htmlFor="askInputStatic">
              {t('hero.ask.label')}
            </label>
            <input
              id="askInputStatic"
              type="text"
              autoComplete="off"
              placeholder={t('hero.ask.placeholderShort')}
              maxLength={2000}
            />
            <button className="btn btn-primary" type="submit">
              {t('process.ask.title')}
            </button>
          </form>
          <p className="ask-note">{t('hero.ask.note')}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/register">
              {t('final.cta')}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}
