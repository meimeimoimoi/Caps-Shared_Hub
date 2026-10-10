import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RegisterForm,
  type RegisterFormValues,
} from '@/components/auth/RegisterForm'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { AuthLanguageToggle } from '@/components/auth/AuthLanguageToggle'
import { useAuth } from '../features/auth/hooks/useAuth'

/* Đăng ký khách hàng. Chuyên gia đăng ký ở /expert/register (luồng nhiều bước, tài khoản riêng). */
export default function RegisterPage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('register.pageTitle')} | Shared Hub`
  }, [t])
  const nameInput = useRef<HTMLInputElement>(null)
  const { register, isLoading, error } = useAuth()

  useEffect(() => {
    nameInput.current?.focus()
  }, [])

  const submit = async (values: RegisterFormValues) => {
    try {
      await register(values)
    } catch {
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
      <RegisterForm
        onSubmit={submit}
        nameInputRef={nameInput}
        isLoading={isLoading}
        error={error}
      />
    </main>
  )
}
