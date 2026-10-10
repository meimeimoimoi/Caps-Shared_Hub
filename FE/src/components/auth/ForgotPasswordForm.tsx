import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Mail, MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isValidEmail } from '@/utils/validators'
import { authApi } from '@/features/auth/api/authApi'
import { useMotion } from '@/components/ui/motion'
import { BackButton } from './BackButton'
import { AuthCardHeader } from './AuthCardHeader'
import {
  CARD_CLASS,
  ERROR_CLASS,
  FIELD_ICON_CLASS,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
  TITLE_CLASS,
} from './EmailLoginForm'

/* Bước 1 của quên mật khẩu: gửi liên kết đặt lại về email.
 * Luôn báo "đã gửi" như nhau để không lộ email nào có tài khoản. */
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'panel' })
  const [email, setEmail] = useState('')
  const [error, setError] = useState<
    'validation.emailRequired' | 'validation.emailInvalid' | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()

  useEffect(() => {
    if (!sent) input.current?.focus()
  }, [sent])

  const send = () => {
    setBusy(true)
    setFailed(false)
    authApi
      .requestPasswordReset(email.trim())
      .then(() => setSent(true))
      .catch(() => setFailed(true))
      .finally(() => setBusy(false))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const next = !email.trim()
      ? 'validation.emailRequired'
      : isValidEmail(email)
        ? null
        : 'validation.emailInvalid'
    setError(next)
    if (!next) send()
  }

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[440px]">
      <div className={CARD_CLASS}>
        {sent ? (
          <div className="pt-4 text-center" role="status">
            <BackButton onClick={onBack} />
            <MailCheck
              aria-hidden="true"
              size={40}
              className="mx-auto mb-4 text-[var(--accent)]"
            />
            <h1 className={cn(TITLE_CLASS, 'font-sans')}>
              {t('forgot.sentTitle')}
            </h1>
            <p className="text-[13px] leading-[1.6] text-[var(--body)]">
              {t('forgot.sentBody', { email: email.trim() })}
            </p>
            <button
              type="button"
              onClick={onBack}
              className={cn(PRIMARY_BUTTON_CLASS, 'mt-7 font-sans')}
            >
              {t('forgot.backToSignIn')}
            </button>
            <p className="mt-5 text-[12.5px] text-white/50">
              {t('forgot.notReceived')}{' '}
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className={LINK_CLASS}
              >
                {busy ? t('forgot.sending') : t('forgot.resend')}
              </button>
            </p>
          </div>
        ) : (
          <>
            <AuthCardHeader
              title={t('forgot.title')}
              description={t('forgot.description')}
              onBack={onBack}
            />
            <form onSubmit={submit} noValidate>
              <div className="mb-5 text-left">
                <label htmlFor={id} className={cn(LABEL_CLASS, 'font-sans')}>
                  {t('email.label')}
                </label>
                <div className="relative flex items-center">
                  <input
                    ref={input}
                    id={id}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    placeholder={t('email.placeholder')}
                    autoComplete="email"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={cn(
                      INPUT_CLASS,
                      'font-sans',
                      error && INPUT_ERROR_CLASS
                    )}
                  />
                  <Mail
                    aria-hidden="true"
                    size={20}
                    className={FIELD_ICON_CLASS}
                  />
                </div>
                {error && (
                  <p id={`${id}-error`} className={ERROR_CLASS}>
                    {t(error)}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={busy}
                className={cn(PRIMARY_BUTTON_CLASS, 'font-sans')}
              >
                <span>{busy ? t('forgot.sending') : t('forgot.submit')}</span>
                {!busy && <ArrowRight aria-hidden="true" size={18} />}
              </button>
            </form>
          </>
        )}
        {failed && (
          <p role="alert" className="mt-3 text-sm text-[var(--err)]">
            {t('forgot.failed')}
          </p>
        )}
      </div>
    </div>
  )
}
