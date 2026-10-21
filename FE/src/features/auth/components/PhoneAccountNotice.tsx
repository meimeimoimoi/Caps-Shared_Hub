import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { usePhoneAccountCheck } from '../hooks/usePhoneAccountCheck'

/* Neutral note under an expert phone field: a different number is allowed (work phone), so the
 * user can copy it to the account or keep both. Never blocks saving or submitting. */
export function PhoneAccountNotice({
  phone,
  className,
}: {
  phone: string
  className?: string
}) {
  const { t } = useTranslation('auth')
  const check = usePhoneAccountCheck(phone)

  if (
    check.dismissed ||
    check.status === 'none' ||
    check.status === 'same'
  )
    return null

  return (
    <div
      role="status"
      className={
        className ??
        'mt-2 flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-[12.5px] leading-[1.5]'
      }
    >
      <Info aria-hidden="true" size={15} className="mt-[2px] flex-none" />
      <div className="min-w-0">
        <p>
          {check.status === 'different'
            ? t('phoneCheck.different', { phone: check.accountPhone })
            : t('phoneCheck.accountEmpty')}
        </p>
        {check.failed && <p role="alert">{t('phoneCheck.failed')}</p>}
        <div className="mt-1.5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={check.saving}
            aria-busy={check.saving}
            onClick={() => void check.saveToAccount()}
            className="font-semibold underline underline-offset-2"
          >
            {check.status === 'different'
              ? t('phoneCheck.updateAccount')
              : t('phoneCheck.saveToAccount')}
          </button>
          <button
            type="button"
            disabled={check.saving}
            onClick={check.keepDifferent}
            className="underline underline-offset-2"
          >
            {check.status === 'different'
              ? t('phoneCheck.keepDifferent')
              : t('phoneCheck.notNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PhoneAccountNotice
