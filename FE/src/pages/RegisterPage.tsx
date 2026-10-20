import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RegisterForm,
  type RegisterFormValues,
} from '@/components/auth/RegisterForm'
import { VideoBackground } from '@/components/auth/VideoBackground'
import {
  CARD_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '@/components/auth/EmailLoginForm'
import { LanguageToggle as AuthLanguageToggle } from '@/components/ui/layout/language-toggle'
import { useAuth } from '../features/auth/hooks/useAuth'
import { SignedInNotice } from '../features/auth/components/SignedInNotice'
import { DEFAULT_HOME } from '../features/auth/utils/returnPath'

const signedInClasses = {
  card: CARD_CLASS,
  title:
    'text-center text-[22px] leading-[1.2] font-bold tracking-[-0.025em] text-white',
  body: 'mt-3 text-center text-[14.5px] leading-[1.55] text-white/75 [&_strong]:text-white',
  primary: PRIMARY_BUTTON_CLASS,
  secondary: SECONDARY_BUTTON_CLASS,
}

/* Đăng ký khách hàng. Chuyên gia đăng ký ở /expert/register (luồng nhiều bước, tài khoản riêng). */
export default function RegisterPage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('register.pageTitle')} | Shared Hub`
  }, [t])
  const nameInput = useRef<HTMLInputElement>(null)
  const { register, isLoading, error, user, isAuthenticated } = useAuth()

  useEffect(() => {
    nameInput.current?.focus()
  }, [])

  // The account created here signs in right away; it goes on to /verify-email, not to the notice
  const [registering, setRegistering] = useState(false)

  const submit = async (values: RegisterFormValues) => {
    setRegistering(true)
    try {
      await register(values)
    } catch {
      setRegistering(false)
      // useAuth giữ nguyên form và trả lỗi API để người dùng thử lại.
    }
  }

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
      {/* Already signed in (often restored silently from the refresh cookie): name the account
          instead of showing a form that would replace its session. */}
      {isAuthenticated && !registering ? (
        <div className="relative z-2 w-full max-w-[440px]">
          <SignedInNotice
            continueTo={
              user?.roles?.includes('EXPERT') ? '/expert' : DEFAULT_HOME
            }
            classes={signedInClasses}
          />
        </div>
      ) : (
        <RegisterForm
          onSubmit={submit}
          nameInputRef={nameInput}
          isLoading={isLoading}
          error={error}
        />
      )}
    </main>
  )
}
