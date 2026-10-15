import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useEmailVerifiedSignal } from '@/features/auth/utils/emailVerifiedSignal'
import { EmailCodeField } from '@/components/auth/EmailCodeField'
import type { VerifyPurpose } from '../hooks/useRegistrationForm'

const COOLDOWN_SECONDS = 60

export interface EmailVerificationNoticeProps {
  email: string
  /** Re-checks the status (after the code is entered or the link is opened in another tab) */
  onCheck: () => Promise<void>
  onClose: () => void
  /** Why the dialog opened: submitting, or uploading past the unverified file limit */
  purpose?: VerifyPurpose
}

/* The application is filled in and saved before the email is verified; this dialog opens on submit,
 * or when an unverified account tries to upload more files than allowed. */
export function EmailVerificationNotice({
  email,
  onCheck,
  onClose,
  purpose = 'submit',
}: EmailVerificationNoticeProps) {
  const { t } = useTranslation('expertRegistration')
  const [cooldown, setCooldown] = useState(0)
  const codeArea = useRef<HTMLDivElement>(null)
  // Modal focus vào hộp thoại khi mở; chuyển sang ô mã đầu tiên để gõ ngay
  useEffect(() => {
    codeArea.current?.querySelector('input')?.focus()
  }, [])
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
    <Modal
      title={t(
        purpose === 'upload' ? 'verifyEmail.uploadTitle' : 'verifyEmail.title'
      )}
      description={t(
        purpose === 'upload' ? 'verifyEmail.uploadBody' : 'verifyEmail.body',
        { email }
      )}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="expert-footer-btn cursor-pointer"
          onClick={onClose}
        >
          {t('verifyEmail.later')}
        </button>
      }
    >
      <div ref={codeArea} className="mt-5">
        <EmailCodeField tone="light" onVerified={() => void onCheck()} />
      </div>
      <p className="!mt-4 !mb-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px]">
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
    </Modal>
  )
}
