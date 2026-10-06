import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { isLanguage } from '@/lib/i18n/language'

const options = [
  { value: 'vi' as const, label: 'Tiếng Việt' },
  { value: 'en' as const, label: 'English' },
]

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common')
  return (
    <CustomSelect
      label={t('language.label')}
      value={isLanguage(i18n.language) ? i18n.language : 'vi'}
      options={options}
      onChange={(language) => {
        void i18n.changeLanguage(language)
      }}
      className="shrink-0 text-sm [&>span]:sr-only"
      triggerClassName="!w-36"
      menuClassName="!left-auto !w-36"
    />
  )
}
