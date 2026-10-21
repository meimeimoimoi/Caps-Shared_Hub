import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BriefcaseBusiness, UserRound } from 'lucide-react'
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader'
import { CARD_CLASS } from '@/components/auth/EmailLoginForm'
import { useMotion } from '@/components/ui/motion'
import type { SignupRole } from '../utils/signupRole'

const OPTION_CLASS =
  'motion-interactive group flex w-full items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-4 text-left hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--link)] disabled:cursor-not-allowed disabled:opacity-60'

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
  const options: { role: SignupRole; icon: ReactNode }[] = [
    { role: 'client', icon: <UserRound aria-hidden="true" size={22} /> },
    { role: 'expert', icon: <BriefcaseBusiness aria-hidden="true" size={22} /> },
  ]

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[440px]">
      <div className={CARD_CLASS}>
        <AuthBrandHeader title={title} />
        {description && (
          <p className="-mt-3 mb-5 text-center text-[13.5px] leading-[1.55] text-white/65">
            {description}
          </p>
        )}
        <div className="flex flex-col gap-3" role="group" aria-label={title}>
          {options.map(({ role, icon }) => (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(role)}
              className={OPTION_CLASS}
            >
              <span className="grid size-11 flex-none place-items-center rounded-xl bg-white/8 text-white">
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-white">
                  {t(`roleChoice.${role}.title`)}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-white/60">
                  {t(`roleChoice.${role}.body`)}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={18}
                className="flex-none text-white/45 transition-transform group-hover:translate-x-0.5"
              />
            </button>
          ))}
        </div>
        {footer}
      </div>
    </div>
  )
}

export default RoleChoice
