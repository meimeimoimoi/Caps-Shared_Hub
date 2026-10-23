import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader'
import { useMotion } from '@/components/ui/motion'
import type { SignupRole } from '../utils/signupRole'
import clientImage from '../assets/role-client.webp'
import expertImage from '../assets/role-expert.webp'

const OPTION_CLASS =
  'motion-interactive group flex w-full flex-col rounded-3xl border border-white/15 bg-[#171a1e] p-3 text-left shadow-[0_16px_48px_-20px_#000000b3] transition-[border-color,box-shadow] duration-300 hover:border-[#ffb17b]/60 hover:shadow-[0_24px_56px_-20px_#000000cc] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--link)] disabled:cursor-not-allowed disabled:opacity-60'

export interface RoleChoiceProps {
  onChoose: (role: SignupRole) => void
  /** Heading of the card; sign-up and the first sign-in after Google use different wording */
  title: string
  description?: string
  disabled?: boolean
  /** Extra content under the options, e.g. the link to sign in */
  footer?: ReactNode
}

/* First step of sign-up, also shown once to accounts created through Google: the choice only picks
 * the page that opens next and grants nothing. */
export function RoleChoice({
  onChoose,
  title,
  description,
  disabled = false,
  footer,
}: RoleChoiceProps) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'reveal' })
  const options: { role: SignupRole; image: string }[] = [
    { role: 'client', image: clientImage },
    { role: 'expert', image: expertImage },
  ]

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[800px] py-4">
      <div className="mx-auto max-w-[480px]">
        <AuthBrandHeader title={title} />
        {description && (
          <p className="-mt-3 mb-5 text-center text-[13.5px] leading-[1.55] text-white/65">
            {description}
          </p>
        )}
      </div>
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6"
        role="group"
        aria-label={title}
      >
        {options.map(({ role, image }) => (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(role)}
            className={OPTION_CLASS}
          >
            <span className="block aspect-[3/2] w-full overflow-hidden rounded-[14px] bg-[#25282b]">
              <img
                src={image}
                alt=""
                width={960}
                height={1200}
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
              />
            </span>
            <span className="flex w-full flex-1 flex-col px-3 pt-6 pb-3 sm:px-4">
              <span className="block text-[26px] leading-tight font-semibold tracking-[-0.025em] text-[#faf4ed]">
                {t(`roleChoice.${role}.title`)}
              </span>
              <span className="mt-3 mb-7 block max-w-[34ch] text-sm leading-6 font-normal text-[#c8c4be]">
                {t(`roleChoice.${role}.body`)}
              </span>
              <span
                aria-hidden="true"
                className="mt-auto flex min-h-12 items-center justify-between gap-4 rounded-xl border border-[#ffb17b]/30 bg-[#ffb17b]/[0.06] px-4 py-3 text-sm font-semibold text-[#ffc398] transition-colors duration-300 group-hover:border-[#ffb17b] group-hover:bg-[#ffb17b] group-hover:text-[#22170f] group-focus-visible:border-[#ffb17b] group-focus-visible:bg-[#ffb17b] group-focus-visible:text-[#22170f]"
              >
                {t('roleChoice.continue')}
                <ArrowRight
                  aria-hidden="true"
                  size={18}
                  className="flex-none transition-transform motion-safe:group-hover:translate-x-1"
                />
              </span>
            </span>
          </button>
        ))}
      </div>
      {footer}
    </div>
  )
}

export default RoleChoice
