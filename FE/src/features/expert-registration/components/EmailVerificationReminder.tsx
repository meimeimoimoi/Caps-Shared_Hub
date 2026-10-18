import { Trans, useTranslation } from 'react-i18next'
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
      className="bg-warning-soft mb-6 flex items-start gap-3.5 rounded-lg border border-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)] p-4 max-sm:flex-wrap"
    >
      <span
        aria-hidden="true"
        className="text-warning grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ui-warning)_14%,transparent)]"
      >
        <MailWarning size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ex-ink !mb-0.5 text-[14px] font-semibold">
          {t('verifyReminder.title')}
        </p>
        <p className="text-ex-muted !mb-0 text-[13px] leading-normal">
          <Trans
            t={t}
            i18nKey="verifyReminder.body"
            values={{ email }}
            components={{
              strong: (
                <strong className="text-ex-ink font-semibold break-words" />
              ),
            }}
          />
        </p>
      </div>
      <button
        type="button"
        onClick={onVerify}
        className="border-ex-btn-border bg-ex-panel text-ex-ink hover:bg-ex-btn-hover min-h-10 shrink-0 cursor-pointer self-center rounded-md border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors max-sm:w-full"
      >
        {t('verifyReminder.action')}
      </button>
    </div>
  )
}
