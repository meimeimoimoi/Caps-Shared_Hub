import { useTranslation } from 'react-i18next'
import { MailWarning } from 'lucide-react'

/** Shown above the wizard while the email is unverified: filling in is allowed, submitting is not. */
export function EmailVerificationReminder({
  email,
  onVerify,
}: {
  email: string
  /** Opens the same verification dialog used on submit */
  onVerify: () => void
}) {
  const { t } = useTranslation('expertRegistration')
  return (
    <div
      role="status"
      className="bg-ex-notice-bg text-ex-notice-text mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[5px] p-[14px_16px] text-[14px]"
    >
      <MailWarning size={18} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">
        {t('verifyReminder.text', { email })}
      </span>
      <button
        type="button"
        onClick={onVerify}
        className="cursor-pointer font-semibold underline underline-offset-4"
      >
        {t('verifyReminder.action')}
      </button>
    </div>
  )
}
