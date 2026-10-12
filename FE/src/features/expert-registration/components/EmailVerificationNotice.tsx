import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailCheck } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useEmailVerifiedSignal } from '@/features/auth/utils/emailVerifiedSignal'
import { EmailCodeField } from '@/components/auth/EmailCodeField'

const COOLDOWN_SECONDS = 60

export interface EmailVerificationNoticeProps {
  email: string
  /** Kiểm tra lại trạng thái sau khi người dùng bấm link ở tab khác */
  onCheck: () => Promise<void>
}

/* Hồ sơ được khai và lưu khi chưa xác nhận email; chỉ bước nộp mới bắt buộc xác nhận. */
export function EmailVerificationNotice({
  email,
  onCheck,
}: EmailVerificationNoticeProps) {
  const { t } = useTranslation('expertRegistration')
  const [cooldown, setCooldown] = useState(0)
  // Bấm link ở tab khác hoặc trên điện thoại: tự kiểm tra lại, dải nhắc biến mất khi đã xác nhận
  useEmailVerifiedSignal(() => {
    void onCheck()
  }, true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<
    'resent' | 'failed' | 'stillPending' | null
  >(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const resend = () => {
    setBusy(true)
    setMessage(null)
    authApi
      .resendVerification()
      .then(() => {
        setMessage('resent')
        setCooldown(COOLDOWN_SECONDS)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 429)
          setCooldown(COOLDOWN_SECONDS)
        else setMessage('failed')
      })
      .finally(() => setBusy(false))
  }

  const check = () => {
    setBusy(true)
    setMessage(null)
    onCheck()
      .then(() => setMessage('stillPending'))
      .finally(() => setBusy(false))
  }

  return (
    <div
      className="expert-pro-notice expert-pro-notice--warn mb-5"
      role="status"
    >
      <MailCheck className="expert-pro-notice-icon" aria-hidden="true" />
      <div>
        <p className="!mb-1">
          <strong>{t('verifyEmail.title')}</strong>{' '}
          {t('verifyEmail.body', { email })}
        </p>
        <div className="my-3 max-w-[420px]">
          <EmailCodeField tone="light" onVerified={() => void onCheck()} />
        </div>
        <p className="!mb-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <button
            type="button"
            className="cursor-pointer underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={resend}
            disabled={busy || cooldown > 0}
          >
            {cooldown > 0
              ? t('verifyEmail.cooldown', { seconds: cooldown })
              : t('verifyEmail.resend')}
          </button>
          <button
            type="button"
            className="cursor-pointer underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={check}
            disabled={busy}
          >
            {t('verifyEmail.check')}
          </button>
          {message && <span>{t(`verifyEmail.${message}`)}</span>}
        </p>
      </div>
    </div>
  )
}
