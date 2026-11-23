import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import {
  RegisterForm,
  type RegisterFormValues,
} from '@/components/auth/RegisterForm'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { LINK_CLASS } from '@/components/auth/EmailLoginForm'
import { LanguageToggle as AuthLanguageToggle } from '@/components/ui/layout/language-toggle'
import { useAuth } from '../features/auth/hooks/useAuth'
import { RoleChoice } from '../features/auth/components/RoleChoice'
import { SignedInRedirect } from '../features/auth/components/SignedInRedirect'
import type { SignupRole } from '../features/auth/utils/signupRole'

/* One sign-up page for customers and experts in two steps: choose what you want, then the form
 * (or Google). The choice only picks the page after verification; it is kept in page state, so a
 * reload asks again. */
export default function RegisterPage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('register.pageTitle')} | Shared Hub`
  }, [t])
  const emailInput = useRef<HTMLInputElement>(null)
  const returnState = useLocation().state
  const { register, loginWithGoogle, isLoading, error, isAuthenticated } =
    useAuth()
  const [role, setRole] = useState<SignupRole | null>(null)
  // Kept while switching back to the first step, so the typed values survive a change of choice
  const [draft, setDraft] = useState<RegisterFormValues | null>(null)

  useEffect(() => {
    if (role) emailInput.current?.focus()
  }, [role])

  // The account created here signs in right away; it goes on to /verify-email, not to the redirect
  const [registering, setRegistering] = useState(false)

  const submit = async (values: RegisterFormValues) => {
    if (!role) return
    setRegistering(true)
    try {
      await register(values, role)
    } catch {
      // useAuth keeps the form and exposes the API error so the user can retry
      setRegistering(false)
    }
  }

  const google = async (idToken: string) => {
    if (!role) return
    setRegistering(true)
    try {
      await loginWithGoogle(idToken, role)
    } catch {
      setRegistering(false)
    }
  }

  return (
    <main className="login-material relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ui-login-canvas)] px-6 py-6 text-[var(--ui-login-text)] max-sm:pt-20">
      <VideoBackground />
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50">
        <AuthLanguageToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/30"
      />
      {isAuthenticated && !registering ? (
        <SignedInRedirect />
      ) : role ? (
        <RegisterForm
          role={role}
          initialValues={draft}
          onChangeRole={(values) => {
            setDraft(values)
            setRole(null)
          }}
          onSubmit={submit}
          onGoogle={google}
          emailInputRef={emailInput}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <RoleChoice
          title={t('roleChoice.title')}
          onChoose={setRole}
          footer={
            <p className="mt-5 text-center text-[13px] leading-[1.6] text-white/55">
              {t('register.haveAccount')}{' '}
              <Link to="/login" state={returnState} className={LINK_CLASS}>
                {t('register.signIn')}
              </Link>
            </p>
          }
        />
      )}
    </main>
  )
}
