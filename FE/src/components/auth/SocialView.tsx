import { Trans, useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoogleIcon } from './GoogleIcon'
import { useMotion } from '@/components/ui/motion'

export type SocialViewProps = {
  onContinueEmail: () => void
  onGoogle: () => void
  className?: string
}

const BRAND_FONT = "font-sans"

const BTN =
  'w-full min-h-[56px] border-0 rounded-[14px] bg-[var(--btn)] text-[var(--btn-ink)] text-[15px] font-medium flex items-center gap-[14px] px-5 cursor-pointer text-left font-sans motion-interactive hover:bg-[var(--btn-hover)] hover:shadow-[0_6px_20px_-6px_color-mix(in_srgb,var(--ui-login-text)_15.0%,transparent)] active:scale-[.995] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)] max-[420px]:min-h-[52px] max-[420px]:px-4'

const TERMS_LINK =
  'text-[var(--link)] font-medium no-underline transition-opacity underline-offset-2 hover:underline hover:opacity-80'

export function SocialView({
  onContinueEmail,
  onGoogle,
  className,
}: SocialViewProps) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'reveal' })

  return (
    <div
      ref={motion}
      className={cn(
        'relative z-1 flex w-full max-w-[480px] flex-col items-center text-center motion-interactive',
        className
      )}
    >
      <h1
        className={cn(
          'mb-2 text-[28px] leading-[1.2] font-bold tracking-[-0.03em] text-white [text-shadow:0_2px_12px_color-mix(in_srgb,var(--ui-overlay-ink)_60.0%,transparent)] max-[420px]:text-[24px]',
          BRAND_FONT
        )}
      >
        {t('social.title')}
      </h1>
      <p className="mb-8 text-sm text-[var(--body)] [text-shadow:0_1px_8px_color-mix(in_srgb,var(--ui-overlay-ink)_60.0%,transparent)]">
        {t('social.description')}
      </p>

      <div className="mb-6 flex w-full flex-col gap-3">
        <button type="button" onClick={onGoogle} className={BTN}>
          <span className="grid h-[22px] w-[22px] flex-none place-items-center">
            <GoogleIcon size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
            <span className="text-[15px] font-medium text-[var(--btn-ink)]">
              {t('actions.google')}
            </span>
          </span>
        </button>
      </div>

      <div className="mt-1 mb-5 flex w-full items-center gap-4 text-[13px] text-[var(--muted)]">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
        {t('actions.or')}
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <button type="button" onClick={onContinueEmail} className={BTN}>
        <span className="grid h-[22px] w-[22px] flex-none place-items-center">
          <Mail size={22} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
          <span className="text-[15px] font-medium text-[var(--btn-ink)]">
            {t('actions.email')}
          </span>
        </span>
      </button>

      <p className="mt-8 max-w-[440px] text-[12.5px] leading-[1.6] text-[var(--body)] [text-shadow:0_1px_8px_color-mix(in_srgb,var(--ui-overlay-ink)_60.0%,transparent)]">
        <Trans
          ns="auth"
          i18nKey="legal"
          components={{
            terms: <a href="#" className={TERMS_LINK} />,
            privacy: <a href="#" className={TERMS_LINK} />,
          }}
        />
      </p>
    </div>
  )
}

export default SocialView
