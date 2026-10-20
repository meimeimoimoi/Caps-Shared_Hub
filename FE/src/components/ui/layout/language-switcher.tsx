import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { isLanguage } from '@/lib/i18n/language'
import { Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

const options = [
  { value: 'vi' as const, label: 'Tiếng Việt' },
  { value: 'en' as const, label: 'English' },
]

export function LanguageSwitcher({
  variant = 'default',
}: {
  variant?: 'default' | 'overlay' | 'account'
}) {
  const { t, i18n } = useTranslation('common')
  const current = isLanguage(i18n.language) ? i18n.language : 'vi'

  if (variant === 'account') {
    return (
      <fieldset className="m-0 min-w-0 border-0 px-3 pt-3 pb-2">
        <legend className="sr-only">{t('language.label')}</legend>
        <div
          aria-hidden="true"
          className="text-text-strong mb-2.5 flex items-center gap-3 text-sm font-medium"
        >
          <Languages size={18} className="text-text-muted shrink-0" />
          {t('language.label')}
        </div>
        <div className="bg-surface-muted grid grid-cols-2 gap-1 rounded-lg p-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              lang={option.value}
              aria-pressed={current === option.value}
              onClick={() => {
                void i18n.changeLanguage(option.value)
              }}
              className={cn(
                'flex min-h-9 cursor-pointer items-center justify-center rounded-md px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text motion-reduce:transition-none',
                current === option.value
                  ? 'bg-surface text-accent-text font-semibold shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <CustomSelect
      label={t('language.label')}
      value={current}
      options={options}
      onChange={(language) => {
        void i18n.changeLanguage(language)
      }}
      className={`relative shrink-0 text-sm [&>span]:sr-only ${variant === 'overlay' ? 'language-switcher--overlay' : ''}`}
      triggerClassName="!w-36 border-border hover:bg-surface-muted focus-visible:!outline-none focus-visible:!border-text-muted"
      menuClassName="!left-auto !w-44 !rounded-xl !p-1.5"
    />
  )
}
