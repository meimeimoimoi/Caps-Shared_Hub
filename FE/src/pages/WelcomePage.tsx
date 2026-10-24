import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoBackground } from '@/components/auth/VideoBackground'
import {
  CARD_CLASS,
  PRIMARY_BUTTON_CLASS,
} from '@/components/auth/EmailLoginForm'
import { LanguageToggle as AuthLanguageToggle } from '@/components/ui/layout/language-toggle'
// Direct file import: the expert-context index re-exports hooks that import the auth feature
import { hasExpertApplication } from '@/features/expert-context/api/expertContextApi'
import { RoleChoice } from '@/features/auth/components/RoleChoice'
import { SignedInRedirect } from '@/features/auth/components/SignedInRedirect'
import {
  EXPERT_APPLICATION_PATH,
  signupDestination,
} from '@/features/auth/utils/signupRole'

type WelcomeState = { welcome?: boolean; from?: unknown; fromState?: unknown } | null

/* Asked once, right after a Google sign-in created the account or after the email was verified on
 * another device: the sign-up choice is not known there. An account that already has an expert
 * application goes straight to it; opening the page directly goes to the account's own area. */
export default function WelcomePage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('roleChoice.welcomeTitle')} | Shared Hub`
  }, [t])
  const navigate = useNavigate()
  const state = useLocation().state as WelcomeState
  const [check, setCheck] = useState<'checking' | 'ask' | 'expert' | 'failed'>(
    'checking'
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!state?.welcome) return
    let cancelled = false
    hasExpertApplication()
      .then((has) => !cancelled && setCheck(has ? 'expert' : 'ask'))
      .catch(() => !cancelled && setCheck('failed'))
    return () => {
      cancelled = true
    }
  }, [state?.welcome, attempt])

  if (!state?.welcome) return <SignedInRedirect />
  if (check === 'expert') return <Navigate to={EXPERT_APPLICATION_PATH} replace />

  return (
    <main className="login-material relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ui-login-canvas)] px-6 py-12 text-[var(--ui-login-text)] max-sm:pt-20">
      <VideoBackground />
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50">
        <AuthLanguageToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/30"
      />
      {check === 'ask' ? (
        <RoleChoice
          title={t('roleChoice.welcomeTitle')}
          onChoose={(role) =>
            navigate(signupDestination(role, state.from), {
              replace: true,
              state: state.fromState,
            })
          }
        />
      ) : (
        <div className="relative z-2 w-full max-w-[440px]">
          <div className={cn(CARD_CLASS, 'text-center')}>
            {check === 'checking' ? (
              <div role="status" className="py-6 text-white/75">
                <Loader2
                  aria-hidden="true"
                  size={28}
                  className="mx-auto mb-3 animate-spin motion-reduce:animate-none"
                />
                <p className="text-[14px]">{t('roleChoice.checking')}</p>
              </div>
            ) : (
              // The account is not misclassified while the expert service is unreachable
              <div role="alert" className="py-2">
                <p className="text-[14px] text-white/80">
                  {t('roleChoice.checkFailed')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCheck('checking')
                    setAttempt((n) => n + 1)
                  }}
                  className={cn(PRIMARY_BUTTON_CLASS, 'mt-5 font-sans')}
                >
                  {t('roleChoice.retry')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
