import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Modal } from '@/components/ui/feedback/modal'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useEmailVerifiedSignal } from '@/features/auth/utils/emailVerifiedSignal'
import { EmailCodeField } from '@/components/auth/EmailCodeField'
import type { VerifyPurpose } from '../hooks/useRegistrationForm'

const COOLDOWN_SECONDS = 60

const COPY = {
  submit: { title: 'verifyEmail.title', body: 'verifyEmail.body' },
  upload: { title: 'verifyEmail.uploadTitle', body: 'verifyEmail.uploadBody' },
  reminder: {
    title: 'verifyEmail.reminderTitle',
    body: 'verifyEmail.reminderBody',
  },
} as const satisfies Record<VerifyPurpose, { title: string; body: string }>

type Message = 'resent' | 'failed' | 'stillPending'

const MESSAGE_ICON = {
  resent: CircleCheck,
  failed: CircleAlert,
  stillPending: Info,
} as const satisfies Record<Message, unknown>

export interface EmailVerificationNoticeProps {
  email: string
  /** Re-checks the status (after the code is entered or the link is opened in another tab) */
  onCheck: () => Promise<void>
  onClose: () => void
  /** Why the dialog opened: submitting, uploading past the unverified file limit, or the reminder */
  purpose?: VerifyPurpose
}

/* The application is filled in and saved before the email is verified; this dialog opens on submit,
 * from the reminder, or when an unverified account reaches its file limit. */
export function EmailVerificationNotice({
  email,
  onCheck,
  onClose,
  purpose = 'submit',
}: EmailVerificationNoticeProps) {
  const { t } = useTranslation('expertRegistration')
  const [cooldown, setCooldown] = useState(0)
  // A new code makes the typed one and its error stale: remount the field to start clean
  const [codeRound, setCodeRound] = useState(0)
  const codeArea = useRef<HTMLDivElement>(null)
  // The modal focuses itself on open; move focus to the first code box so typing can start at once
  useEffect(() => {
    codeArea.current?.querySelector('input')?.focus()
  }, [codeRound])
  // Link opened in another tab or on a phone: check again; the dialog closes once verified
  useEmailVerifiedSignal(() => {
    void onCheck()
  }, true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

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
        setCodeRound((n) => n + 1)
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

  const MessageIcon = message ? MESSAGE_ICON[message] : null

  return (
    <Modal
      title={t(COPY[purpose].title)}
      description={
        <Trans
          t={t}
          i18nKey={COPY[purpose].body}
          values={{ email }}
          components={{
            strong: (
              <strong className="text-ex-ink font-semibold break-words" />
            ),
          }}
        />
      }
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
      <div ref={codeArea} className="mt-6">
        <EmailCodeField
          key={codeRound}
          tone="light"
          onVerified={() => void onCheck()}
        />
      </div>

      {message && MessageIcon && (
        <p
          role="status"
          className="expert-verify-message"
          data-tone={
            message === 'failed'
              ? 'error'
              : message === 'resent'
                ? 'ok'
                : 'info'
          }
        >
          <MessageIcon size={16} aria-hidden="true" />
          <span>{t(`verifyEmail.${message}`)}</span>
        </p>
      )}

      <dl className="expert-verify-help">
        <div>
          <dt>{t('verifyEmail.noCode')}</dt>
          <dd>
            {cooldown > 0 ? (
              <span className="expert-verify-wait">
                {t('verifyEmail.cooldown', { seconds: cooldown })}
              </span>
            ) : (
              <button type="button" onClick={resend} disabled={busy}>
                {t('verifyEmail.resend')}
              </button>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('verifyEmail.usedLink')}</dt>
          <dd>
            <button type="button" onClick={check} disabled={busy}>
              {t('verifyEmail.check')}
            </button>
          </dd>
        </div>
      </dl>
    </Modal>
  )
}
