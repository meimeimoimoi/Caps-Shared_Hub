import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmailCodeVerification } from '@/features/auth/hooks/useEmailCodeVerification'

export interface EmailCodeFieldProps {
  onVerified?: () => void
  /** dark: thẻ xác thực nền tối; light: cổng chuyên gia */
  tone?: 'dark' | 'light'
  autoFocus?: boolean
}

/* Ô nhập mã 6 số: tự xác nhận khi đủ số, hỗ trợ dán và điện thoại tự điền mã từ email */
export function EmailCodeField({
  onVerified,
  tone = 'dark',
  autoFocus = false,
}: EmailCodeFieldProps) {
  const { t } = useTranslation('auth')
  const id = useId()
  const { code, setCode, verify, busy, error } =
    useEmailCodeVerification(onVerified)
  const dark = tone === 'dark'

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void verify()
      }}
      className="text-left"
    >
      <label
        htmlFor={id}
        className={cn(
          'mb-1.5 block text-[13px] font-semibold',
          dark ? 'text-white/85' : 'text-ex-ink'
        )}
      >
        {t('verify.codeLabel')}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          autoFocus={autoFocus}
          readOnly={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-12 w-full min-w-0 rounded-lg border px-4 text-center font-mono text-[22px] font-semibold tracking-[0.5em] transition-colors outline-none',
            dark
              ? 'border-white/15 bg-white/5 text-white placeholder:text-white/25 focus:border-[var(--accent)]'
              : 'border-ex-btn-border bg-surface text-ex-ink placeholder:text-ex-muted/50 focus:border-ex-accent',
            error && (dark ? '!border-[var(--err)]' : '!border-ex-error-text')
          )}
        />
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className={cn(
            'inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
            dark
              ? 'bg-[var(--accent)] text-white'
              : 'bg-ex-accent text-on-accent'
          )}
        >
          {busy && (
            <Loader2
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {busy ? t('verify.codeVerifying') : t('verify.codeSubmit')}
        </button>
      </div>
      <p
        id={`${id}-error`}
        role={error ? 'alert' : undefined}
        className={cn(
          'mt-1.5 min-h-[1.25em] text-[12.5px]',
          error
            ? dark
              ? 'text-[var(--err)]'
              : 'text-ex-error-text'
            : dark
              ? 'text-white/50'
              : 'text-ex-muted'
        )}
      >
        {error
          ? error.key === 'verify.codeInvalid'
            ? t('verify.codeInvalid', { count: error.count })
            : t(error.key)
          : t('verify.codeHint')}
      </p>
    </form>
  )
}
