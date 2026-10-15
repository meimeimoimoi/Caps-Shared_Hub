import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthBrandHeader } from './AuthBrandHeader'
import { GoogleIcon } from './GoogleIcon'
import { GoogleSignInButton } from './GoogleSignInButton'
import {
  CARD_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './EmailLoginForm'
import { useMotion } from '@/components/ui/motion'

const LEGAL_LINK_CLASS =
  'rounded-sm text-white/65 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--link)]'

export type SocialViewProps = {
  onContinueEmail: () => void
  /** Receives the Google ID token. */
  onGoogle: (idToken: string) => void
  /** Google sign-in is not configured or could not load. */
  onGoogleUnavailable: () => void
  isLoading?: boolean
  className?: string
}

/* First sign-in step: shares the glass card and button styles with the email step
 * so switching steps does not shift the layout. */
export function SocialView({
  onContinueEmail,
  onGoogle,
  onGoogleUnavailable,
  isLoading = false,
  className,
}: SocialViewProps) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'reveal' })
  // Giữ trang cần quay lại (nếu có) khi chuyển sang đăng ký
  const returnState = useLocation().state

  return (
    <div
      ref={motion}
      className={cn('relative z-2 w-full max-w-[440px]', className)}
    >
      <div className={CARD_CLASS}>
        <AuthBrandHeader title={t('social.title')} />

        <button
          type="button"
          onClick={onContinueEmail}
          className={cn(PRIMARY_BUTTON_CLASS, 'font-sans')}
        >
          <Mail aria-hidden="true" size={18} />
          <span>{t('actions.email')}</span>
        </button>

        <div className="my-5 flex items-center gap-4 text-[11.5px] font-medium tracking-[0.08em] text-white/35 uppercase">
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
          {t('actions.or')}
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleSignInButton
          onCredential={onGoogle}
          disabled={isLoading}
        >
          <button
            type="button"
            onClick={onGoogleUnavailable}
            disabled={isLoading}
            className={cn(SECONDARY_BUTTON_CLASS, 'font-sans')}
          >
            <GoogleIcon size={18} />
            <span>{t('actions.google')}</span>
          </button>
        </GoogleSignInButton>

        <p className="mt-5 text-center text-[13px] leading-[1.6] text-white/55">
          {t('email.noAccount')}{' '}
          <Link to="/register" state={returnState} className={LINK_CLASS}>
            {t('email.create')}
          </Link>
        </p>
        <p className="mt-1.5 text-center text-[12.5px] leading-[1.6] text-white/45">
          {t('register.expertPrompt')}{' '}
          <Link to="/expert/register" className={LINK_CLASS}>
            {t('register.expertLink')}
          </Link>
        </p>

        <p className="mt-6 border-t border-white/8 pt-5 text-center text-[11.5px] leading-[1.6] text-white/40">
          <Trans
            ns="auth"
            i18nKey="legal"
            components={{
              terms: <a href="#" className={LEGAL_LINK_CLASS} />,
              privacy: <a href="#" className={LEGAL_LINK_CLASS} />,
            }}
          />
        </p>
      </div>
    </div>
  )
}

export default SocialView
