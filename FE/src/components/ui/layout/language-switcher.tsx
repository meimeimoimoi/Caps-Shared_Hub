import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { isLanguage } from '@/lib/i18n/language'
import { Languages } from 'lucide-react'

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
  return (
    <CustomSelect
      label={t('language.label')}
      value={isLanguage(i18n.language) ? i18n.language : 'vi'}
      options={options}
      onChange={(language) => {
        void i18n.changeLanguage(language)
      }}
      className={`relative text-sm [&>span]:sr-only ${variant === 'account' ? 'w-full' : 'shrink-0'} ${variant === 'overlay' ? 'language-switcher--overlay' : ''}`}
      triggerLeading={
        variant === 'account' ? (
          <span className="text-text-strong flex min-w-0 flex-1 items-center gap-3">
            <Languages
              size={18}
              aria-hidden="true"
              className="text-text-muted shrink-0"
            />
            <span>{t('language.label')}</span>
          </span>
        ) : undefined
      }
      triggerClassName={
        variant === 'account'
          ? '!w-full !gap-3 !border-0 !bg-transparent !px-3 !py-2.5 !text-sm !font-medium !text-text-muted whitespace-nowrap tracking-normal [word-spacing:normal] transition-colors hover:!bg-surface-muted'
          : '!w-36 border-border hover:bg-surface-muted focus-visible:!outline-none focus-visible:!border-text-muted'
      }
      menuClassName="!left-auto !w-44 !rounded-xl !p-1.5"
    />
  )
}
