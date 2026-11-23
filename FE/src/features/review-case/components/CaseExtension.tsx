import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExtensionDto } from '../types'

/* Extension (2026-11-20): the expert asks once before the delivery deadline for 1–2 working days;
 * only the client's yes moves the deadline, so the client never bears the delay. */
const MAX_DAYS = 2

/** The expert's request form, shown while IN_REVIEW and nothing was asked yet. */
export function ExtensionForm({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (days: number, reason: string) => void
}) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const [days, setDays] = useState(1)
  const [reason, setReason] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (reason.trim()) onSubmit(days, reason.trim())
      }}
    >
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="text-fg-strong mb-2 font-semibold">{t('extension.days')}</legend>
        {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((n) => (
          <label key={n} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${id}-days`}
              checked={days === n}
              onChange={() => setDays(n)}
            />
            {t('extension.dayOption', { count: n })}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-reason`} className="text-fg-strong block text-sm font-semibold">
        {t('extension.reason')}
      </label>
      <textarea
        id={`${id}-reason`}
        rows={3}
        maxLength={4000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="border-border-control rounded-control shadow-control bg-paper w-full resize-y border px-3 py-2 text-base"
      />
      <button
        type="submit"
        disabled={busy || !reason.trim()}
        className="btn btn-press btn-secondary disabled:opacity-60"
      >
        {t('extension.ask')}
      </button>
    </form>
  )
}

/** Where the request stands, for the expert; and the client's yes/no while it is pending. */
export function ExtensionStatus({
  extension,
  busy,
  onDecide,
}: {
  extension: ExtensionDto
  busy?: boolean
  /** Only the client decides; without it the request is shown read-only */
  onDecide?: (accept: boolean) => void
}) {
  const { t } = useTranslation('reviewCase')
  const pending = extension.decision === null
  return (
    <div className="bg-sunken rounded-surface space-y-2 p-4 text-sm" role={pending ? 'status' : undefined}>
      <p className="text-fg-strong font-semibold">
        {t('extension.asked', { count: extension.days })}
      </p>
      <p className="text-fg break-words whitespace-pre-wrap">{extension.reason}</p>
      <p className="text-fg-muted">
        {pending
          ? t(onDecide ? 'extension.pendingClient' : 'extension.pendingExpert')
          : t(
              extension.decision === 'EXTENSION_ACCEPTED'
                ? 'extension.accepted'
                : 'extension.declined'
            )}
      </p>
      {pending && onDecide && (
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(true)}
            className="btn btn-press btn-primary disabled:opacity-60"
          >
            {t('extension.accept')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(false)}
            className="btn btn-press btn-secondary disabled:opacity-60"
          >
            {t('extension.decline')}
          </button>
        </div>
      )}
    </div>
  )
}
