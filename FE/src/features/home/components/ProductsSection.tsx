import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { HomeText } from './HomeText'
import lookupImage from '../assets/product-tra-cuu.jpg'
import workspaceImage from '../assets/product-workspace.jpg'
import expertsImage from '../assets/product-chuyen-gia.jpg'

export function ProductsSection() {
  const { t } = useTranslation('home')
  return (
    <section
      className="sec products-sec reveal"
      id="san-pham"
      aria-labelledby="h-products"
    >
      <div className="wrap">
        <span className="label r" style={{ '--i': '0' } as CSSProperties}>
          {t('footer.products')}
        </span>
        <h2
          id="h-products"
          className="r"
          style={{ '--i': '1', marginTop: '18px' } as CSSProperties}
        >
          <HomeText i18nKey="products.title" />
        </h2>
        <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
          <HomeText i18nKey="products.lead" />
        </p>
        <ol className="pgrid">
          <li className="pcard r" style={{ '--i': '3' } as CSSProperties}>
            <figure>
              <img
                src={lookupImage}
                alt={t('products.lookup.alt')}
                width="1000"
                height="1250"
                loading="lazy"
                decoding="async"
              />
              <span className="tag">
                <b>01</b>
                {t('products.lookup.tag')}
              </span>
            </figure>
            <h3>{t('footer.lookup')}</h3>
            <p>
              <HomeText i18nKey="products.lookup.desc" />
            </p>
            <Link className="more" to="/ai-assistant">
              {t('products.lookup.cta')}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li className="pcard r" style={{ '--i': '4' } as CSSProperties}>
            <figure>
              <img
                src={workspaceImage}
                alt={t('products.workspace.alt')}
                width="1000"
                height="1250"
                loading="lazy"
                decoding="async"
              />
              <span className="tag">
                <b>02</b>
                {t('products.workspace.tag')}
              </span>
            </figure>
            <h3>{t('footer.workspace')}</h3>
            <p>
              <HomeText i18nKey="products.workspace.desc" />
            </p>
            <Link className="more" to="/drafts">
              {t('products.workspace.cta')}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li className="pcard r" style={{ '--i': '5' } as CSSProperties}>
            <figure>
              <img
                src={expertsImage}
                alt={t('products.experts.alt')}
                width="1000"
                height="1250"
                loading="lazy"
                decoding="async"
              />
              <span className="tag">
                <b>03</b>
                {t('products.experts.tag')}
              </span>
            </figure>
            <h3>{t('footer.experts')}</h3>
            <p>
              <HomeText i18nKey="products.experts.desc" />
            </p>
            <Link className="more" to="/login">
              {t('products.experts.cta')}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ol>
      </div>
    </section>
  )
}
