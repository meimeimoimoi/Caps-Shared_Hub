import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Hand, LockKeyhole, Undo2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useFormatters } from '@/hooks/useFormatters'
import type { ReviewClaim } from '../types'

const HOUR_MS = 3_600_000

/**
 * Who works on the review, above the assessment: free (claim it), mine (time left, give it back) or held by
 * another reviewer (read only). Time left uses the server's expiry, never the browser clock alone.
 */
export function ClaimBar({
  current,
  canClaim,
  claimable,
  pending,
  onClaim,
  onRelease,
}: {
  current: ReviewClaim | null
  canClaim: boolean
  /** The review waits for a decision or for the expert; otherwise nothing is shown */
  claimable: boolean
  pending: boolean
  onClaim: () => void
  onRelease: () => void
}) {
  const { t } = useTranslation('admin')
  const format = useFormatters()
  const [now] = useState(() => Date.now())
  if (!claimable && !current) return null

  const timeLeft = (iso: string) => {
    const hours = Math.max(0, (new Date(iso).getTime() - now) / HOUR_MS)
    return hours >= 48
      ? format.relativeTime(Math.floor(hours / 24), 'day')
      : format.relativeTime(Math.max(1, Math.floor(hours)), 'hour')
  }

  const help = (
    <HelpTip label={t('claim.helpLabel')}>
      <p>{t('claim.help')}</p>
    </HelpTip>
  )

  if (!current) {
    return (
      <div className="border-border bg-surface flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <Hand size={16} aria-hidden="true" className="text-text-muted shrink-0" />
        <p className="text-text-strong flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
          {t('claim.free')}
          {help}
        </p>
        {canClaim && (
          <Button size="sm" disabled={pending} onClick={onClaim}>
            {t('claim.take')}
          </Button>
        )}
      </div>
    )
  }

  if (current.heldByMe) {
    return (
      <div className="border-success/30 bg-success-soft flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <UserRound size={16} aria-hidden="true" className="text-success shrink-0" />
        <p className="text-text-strong flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-sm font-medium">
          {t('claim.mine')}
          <span className="text-text-muted font-normal">
            ·{' '}
            {current.expiresAt
              ? t('claim.expiresIn', { time: timeLeft(current.expiresAt) })
              : t('claim.waitingForExpert')}
          </span>
          {help}
        </p>
        <Button size="sm" variant="outline" disabled={pending} onClick={onRelease}>
          <Undo2 size={14} aria-hidden="true" />
          {t('claim.release')}
        </Button>
      </div>
    )
  }

  return (
    <div className="border-border bg-surface-muted flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
      <LockKeyhole size={16} aria-hidden="true" className="text-text-muted shrink-0" />
      <p className="text-text-strong flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
        {t('claim.heldBy', { holder: current.holderEmail ?? t('claim.someone') })}
        {help}
      </p>
    </div>
  )
}
