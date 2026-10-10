import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isLanguage, type Language } from '@/lib/i18n/language'

// Hiện mã ngắn cho gọn; tên đầy đủ đọc cho trình đọc màn hình và hiện khi rê chuột
const options: { value: Language; code: string; label: string }[] = [
  { value: 'vi', code: 'VI', label: 'Tiếng Việt' },
  { value: 'en', code: 'EN', label: 'English' },
]

// dark: trên nền tối (trang đăng nhập, panel đăng ký chuyên gia); light: trên header sáng của portal
const tones = {
  dark: {
    root: 'border-white/10 bg-black/25 backdrop-blur-md',
    icon: 'text-white/45',
    thumb:
      'bg-[var(--accent)]/15 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent)]',
    label:
      'text-white/55 group-hover:text-white peer-checked:text-[var(--link)] peer-focus-visible:outline-[var(--accent)]',
  },
  light: {
    root: 'border-[var(--ui-border)] bg-[var(--ui-surface)]',
    icon: 'text-[var(--ui-text-muted)]',
    thumb:
      'bg-[var(--ui-accent)]/10 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ui-accent)_45%,transparent)]',
    label:
      'text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-strong)] peer-checked:text-[var(--ui-accent-text)] peer-focus-visible:outline-[var(--ui-accent-text)]',
  },
}

/* Nút gạt ngôn ngữ; cùng thiết kế với FooterLanguageToggle của trang chủ
 * (CSS trang chủ chỉ áp dụng trong #shub-home nên ở đây viết bằng Tailwind). */
export function AuthLanguageToggle({
  className,
  tone = 'dark',
}: {
  className?: string
  tone?: keyof typeof tones
}) {
  const { t, i18n } = useTranslation('common')
  const current = isLanguage(i18n.language) ? i18n.language : 'vi'
  const activeIndex = options.findIndex((option) => option.value === current)
  const style = tones[tone]

  return (
    <fieldset
      className={cn(
        'relative z-2 m-0 inline-flex min-w-0 items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5',
        style.root,
        className
      )}
    >
      <legend className="sr-only">{t('language.label')}</legend>
      <Globe size={15} aria-hidden="true" className={cn('flex-none', style.icon)} />
      <div className="relative grid grid-cols-2">
        <span
          aria-hidden="true"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          className={cn(
            'absolute inset-y-0 left-0 w-1/2 rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none',
            style.thumb
          )}
        />
        {options.map((option) => (
          <label
            key={option.value}
            lang={option.value}
            title={option.label}
            className="group relative cursor-pointer"
          >
            <input
              type="radio"
              name="auth-language"
              value={option.value}
              aria-label={option.label}
              checked={current === option.value}
              onChange={() => {
                void i18n.changeLanguage(option.value)
              }}
              className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
            />
            <span
              className={cn(
                'block rounded-full px-3 py-1 text-center text-[12.5px] font-semibold tracking-[0.04em] whitespace-nowrap transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                style.label
              )}
            >
              {option.code}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default AuthLanguageToggle
