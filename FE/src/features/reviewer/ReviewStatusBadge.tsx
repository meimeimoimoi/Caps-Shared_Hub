import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/display/status-badge'
import type { ReviewStatus } from './domain'
import type { Tone } from '@/lib/constants'

const tones: Record<ReviewStatus, Tone> = {
  PENDING_REVIEW: 'neutral',
  NEED_MORE_INFORMATION: 'warning',
  PASSED: 'success',
  NOT_ELIGIBLE: 'danger',
  FAILED: 'danger',
  PENDING_FINAL_APPROVAL: 'accent',
}
export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = useTranslation('reviewer')
  return (
    <StatusBadge
      status={{ label: t(`statuses.${status}`), tone: tones[status] }}
    />
  )
}
