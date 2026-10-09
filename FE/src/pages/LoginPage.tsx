import { useEffect, useRef, useState } from 'react'
import { SocialView } from '@/components/auth/SocialView'
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { useAuth } from '../features/auth/hooks/useAuth'
import type { LoginFormValues } from '../features/auth/types'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  useEffect(() => { document.title = `${t('social.title')} | Shared Hub` }, [t])
  // Trang đặt lại mật khẩu gửi state { view: 'forgot' } khi liên kết hết hạn
  const initialView = (useLocation().state as { view?: 'forgot' } | null)?.view
  const [view, setView] = useState<'social' | 'email' | 'forgot'>(initialView ?? 'social')
  const [notice, setNotice] = useState<'googleUnavailable' | null>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const { login, isLoading, error } = useAuth()

  useEffect(() => {
    if (view === 'email') emailInput.current?.focus()
  }, [view])

  const submit = async (values: LoginFormValues) => {
    setNotice(null)
    try {
      await login(values)
    } catch {
      // useAuth preserves the form and exposes the API error for retry.
    }
  }
  const google = () => setNotice('googleUnavailable')

  return (
    <main className="login-material relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ui-login-canvas)] px-6 py-12 text-[var(--ui-login-text)]">
      <VideoBackground />
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50"><LanguageSwitcher variant="overlay" /></div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/30" />
      {view === 'social' ? (
        <SocialView onContinueEmail={() => { setNotice(null); setView('email') }} onGoogle={google} />
      ) : view === 'forgot' ? (
        <ForgotPasswordForm onBack={() => setView('email')} />
      ) : (
        <EmailLoginForm
          onBack={() => { setNotice(null); setView('social') }}
          onGoogle={google}
          onForgot={() => { setNotice(null); setView('forgot') }}
          onSubmit={submit}
          emailInputRef={emailInput}
          isLoading={isLoading}
          error={error}
        />
      )}
      {notice && <p role="status" className="relative z-10 mt-6 max-w-[480px] rounded-xl bg-black/70 px-5 py-3 text-center text-sm text-white">{t(notice)}</p>}
    </main>
  )
}
