import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { RegisterFormValues } from '@/features/auth/types'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import { useTranslation } from 'react-i18next'

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  useEffect(() => { document.title = `${t('register.title')} | Shared Hub` }, [t])
  const { register, isLoading, error } = useAuth()

  const submit = async (values: RegisterFormValues) => {
    try {
      await register(values)
    } catch {
      // useAuth giữ nguyên form và hiển thị lỗi API để người dùng thử lại.
    }
  }

  return (
    <main className="login-material relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ui-login-canvas)] px-6 py-12 text-[var(--ui-login-text)]">
      <VideoBackground />
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50"><LanguageSwitcher variant="overlay" /></div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/30" />
      <RegisterForm
        onBack={() => navigate('/login')}
        onSubmit={submit}
        isLoading={isLoading}
        error={error}
      />
    </main>
  )
}
