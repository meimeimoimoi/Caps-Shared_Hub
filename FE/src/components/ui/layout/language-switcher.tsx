import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { isLanguage } from '@/lib/i18n/language'

const options = [
  { value: 'vi' as const, label: 'Tiếng Việt' },
  { value: 'en' as const, label: 'English' },
]

export function LanguageSwitcher({
  variant = 'default',
}: {
  variant?: 'default' | 'overlay'
}) {
  const { t, i18n } = useTranslation('common')
  return (
    <CustomSelect
      label={t('language.label')}
      value={isLanguage(i18n.language) ? i18n.language : 'vi'}
      options={options}
      onChange={(language) => {
        void i18n.changeLanguage(language)
      }}
      className={`relative z-50 shrink-0 text-sm [&>span]:sr-only ${variant === 'overlay' ? 'language-switcher--overlay' : ''}`}
      triggerClassName="!w-36 border-border hover:bg-surface-muted focus-visible:!outline-accent-text focus-visible:!outline-2 focus-visible:!outline-offset-2"
      menuClassName="!left-auto !w-44 !rounded-xl !p-1.5"
    />
  )
}
