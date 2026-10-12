import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmailCodeVerification } from '@/features/auth/hooks/useEmailCodeVerification'

const LENGTH = 6

export interface EmailCodeFieldProps {
  onVerified?: () => void
  /** dark: thẻ xác thực nền tối; light: cổng chuyên gia */
  tone?: 'dark' | 'light'
  autoFocus?: boolean
}

/* Mã 6 số, mỗi ô một chữ số: tự nhảy ô, dán/tự điền cả mã một lần, đủ số thì tự xác nhận */
export function EmailCodeField({
  onVerified,
  tone = 'dark',
  autoFocus = false,
}: EmailCodeFieldProps) {
  const { t } = useTranslation('auth')
  const id = useId()
  const { code, setCode, verify, busy, error } =
    useEmailCodeVerification(onVerified)
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const dark = tone === 'dark'
  // Giữ từng ô riêng để xóa một số ở giữa không làm các số sau dồn lên
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''))

  const update = (next: string[]) => {
    setDigits(next)
    // Còn ô trống thì chuỗi ngắn hơn 6 ký tự nên hook chưa tự xác nhận
    setCode(next.join(''))
  }

  const focusBox = (i: number) => {
    const box = boxes.current[Math.max(0, Math.min(LENGTH - 1, i))]
    box?.focus()
    box?.select()
  }

  // Nhập sai thì hook xóa mã: làm trống các ô và đưa con trỏ về ô đầu để nhập lại ngay
  const [shownError, setShownError] = useState(error)
  if (error !== shownError) {
    setShownError(error)
    if (error && code === '') setDigits(Array(LENGTH).fill(''))
  }
  useEffect(() => {
    if (error) focusBox(0)
  }, [error])

  /** Ghi chuỗi số vào từ ô `start` (gõ 1 số, dán cả mã, hoặc điện thoại tự điền vào ô đầu) */
  const fill = (start: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '')
    if (!incoming) return
    const next = [...digits]
    let i = start
    for (const d of incoming) {
      if (i >= LENGTH) break
      next[i++] = d
    }
    update(next)
    focusBox(i)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      // Ô đang trống thì xóa và lùi về ô trước, giống cách gõ trên một ô liền
      const target = next[i] ? i : i - 1
      if (target < 0) return
      next[target] = ''
      update(next)
      focusBox(target)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    fill(i, e.clipboardData.getData('text'))
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void verify()
      }}
      className="text-left"
    >
      <p
        id={`${id}-label`}
        className={cn(
          'mb-2 text-center text-[13px] font-semibold',
          dark ? 'text-white/85' : 'text-ex-ink'
        )}
      >
        {t('verify.codeLabel')}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-message`}
        className="flex justify-center gap-2 sm:gap-2.5"
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el
            }}
            value={digit}
            onChange={(e) => fill(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            // Điện thoại gợi ý mã từ email vào ô đầu; fill() trải đều sang các ô còn lại
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? LENGTH : 1}
            autoFocus={autoFocus && i === 0}
            readOnly={busy}
            aria-label={t('verify.codeDigit', {
              position: i + 1,
              total: LENGTH,
            })}
            aria-invalid={error ? true : undefined}
            className={cn(
              'h-12 w-11 rounded-lg border text-center font-mono text-[22px] font-semibold transition-colors outline-none sm:h-14 sm:w-12',
              dark
                ? 'border-white/15 bg-white/8 text-white focus:border-[var(--accent)] focus:bg-white/12'
                : 'border-ex-btn-border bg-surface text-ex-ink focus:border-ex-accent',
              digit && (dark ? 'border-white/35' : 'border-ex-accent/60'),
              error && (dark ? '!border-[var(--err)]' : '!border-ex-error-text')
            )}
          />
        ))}
      </div>
      <p
        id={`${id}-message`}
        role={error ? 'alert' : undefined}
        className={cn(
          'mt-2 min-h-[1.25em] text-center text-[12.5px]',
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
      <button
        type="submit"
        disabled={busy || !digits.every(Boolean)}
        className={cn(
          'mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
          dark ? 'bg-[var(--accent)] text-white' : 'bg-ex-accent text-on-accent'
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
    </form>
  )
}
