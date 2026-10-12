import { useTranslation } from 'react-i18next'
import { suggestEmail } from '@/features/auth/utils/emailSuggestion'
import { cn } from '@/lib/utils'

export interface EmailSuggestionProps {
  email: string
  onApply: (email: string) => void
  /** dark: thẻ đăng nhập/đăng ký nền tối; light: cổng chuyên gia */
  tone?: 'dark' | 'light'
  className?: string
}

/* "Có phải bạn muốn nhập an@gmail.com?" khi tên miền gõ gần giống tên miền phổ biến */
export function EmailSuggestion({
  email,
  onApply,
  tone = 'dark',
  className,
}: EmailSuggestionProps) {
  const { t } = useTranslation('auth')
  const suggestion = suggestEmail(email)
  if (!suggestion) return null
  return (
    <p
      role="status"
      className={cn(
        'mt-1.5 text-[12.5px] leading-[1.5]',
        tone === 'dark' ? 'text-white/70' : 'text-ex-muted',
        className
      )}
    >
      {t('email.suggestion')}{' '}
      <button
        type="button"
        onClick={() => onApply(suggestion)}
        className={cn(
          'cursor-pointer font-semibold underline underline-offset-4',
          tone === 'dark' ? 'text-[var(--link)]' : 'text-ex-accent'
        )}
      >
        {suggestion}
      </button>
      ?
    </p>
  )
}
