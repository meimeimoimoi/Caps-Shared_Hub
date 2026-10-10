import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { isLanguage, type Language } from '@/lib/i18n/language'

const options: { value: Language; label: string }[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export function FooterLanguageToggle() {
  const { t, i18n } = useTranslation('common')
  const current = isLanguage(i18n.language) ? i18n.language : 'vi'
  const activeIndex = options.findIndex((option) => option.value === current)

  return (
    <fieldset className="foot-lang">
      <legend className="sr-only">{t('language.label')}</legend>
      <Globe size={18} aria-hidden="true" className="foot-lang-icon" />
      <div
        className="foot-lang-track"
        style={{ '--i': activeIndex } as CSSProperties}
      >
        <span className="foot-lang-thumb" aria-hidden="true" />
        {options.map((option) => (
          <label key={option.value} lang={option.value}>
            <input
              type="radio"
              name="footer-language"
              value={option.value}
              checked={current === option.value}
              onChange={() => {
                void i18n.changeLanguage(option.value)
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
