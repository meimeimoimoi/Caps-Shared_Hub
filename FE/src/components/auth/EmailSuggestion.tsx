import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { suggestEmail } from '@/features/auth/utils/emailSuggestion'
import { cn } from '@/lib/utils'

export interface EmailSuggestionProps {
  email: string
  onApply: (email: string) => void
  /** dark: thẻ đăng nhập/đăng ký nền tối; light: cổng chuyên gia */
  tone?: 'dark' | 'light'
  className?: string
}

/* Hộp gợi ý khi tên miền gõ gần giống tên miền phổ biến (gmial.com → gmail.com), có nút áp dụng */
export function EmailSuggestion({
  email,
  onApply,
  tone = 'dark',
  className,
}: EmailSuggestionProps) {
  const { t } = useTranslation('auth')
  const suggestion = suggestEmail(email)
  if (!suggestion) return null
  const dark = tone === 'dark'
  return (
    <div
      role="status"
      className={cn(
        'mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-[13px] leading-[1.45]',
        dark
          ? 'border-white/15 bg-white/[0.06] text-white/80'
          : 'border-ex-accent/25 bg-ex-accent/[0.06] text-ex-ink',
        className
      )}
    >
      <Lightbulb
        size={16}
        aria-hidden="true"
        className={cn(
          'shrink-0',
          dark ? 'text-[var(--link)]' : 'text-ex-accent'
        )}
      />
      <span className="min-w-0 flex-1">
        {t('email.suggestion')}{' '}
        <strong
          className={cn(
            'font-semibold break-all',
            dark ? 'text-white' : 'text-ex-ink'
          )}
        >
          {suggestion}
        </strong>
        ?
      </span>
      <button
        type="button"
        onClick={() => onApply(suggestion)}
        className={cn(
          'shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-90',
          dark ? 'bg-[var(--accent)] text-white' : 'bg-ex-accent text-on-accent'
        )}
      >
        {t('email.useSuggestion')}
      </button>
    </div>
  )
}
