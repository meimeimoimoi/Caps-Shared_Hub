import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import type { Gate } from '.'
import { readQueueContext } from './queueContext'
import { useReviewerQueue } from './useReviewerQueue'

const gatePath = (gate: string) => (gate === 'GATE_1' ? '/reviewer/gate-1' : '/reviewer/gate-2')

/**
 * Shown after the reviewer concludes or releases a review: opens the next open review the reviewer can work on,
 * in the queue's current filters and order, or goes back to the queue when none is left.
 */
export function NextReviewBar({ currentId, gate }: { currentId: string; gate: Gate }) {
  const { t } = useTranslation('reviewer')
  const [context] = useState(readQueueContext)
  const { records, total, isLoading } = useReviewerQueue({
    gate: context?.gate ?? gate,
    mode: 'OPEN',
    search: context?.search ?? '',
    page: 1,
    pageSize: 20,
    claim: context?.claim ?? 'MINE_OR_UNCLAIMED',
    sortBy: context?.sortBy,
    sortDescending: context?.sortDescending,
  })
  // Only reviews waiting for a decision: one returned to the expert cannot be worked on yet
  const next = records.find((row) => row.id !== currentId && row.claimable && (!row.held || row.heldByMe))
  // Only the first page is checked, so more rows on the server means the queue is not necessarily empty
  const morePages = total > records.length
  const queuePath = context?.gate === 'ALL' ? '/reviewer' : gatePath(context?.gate ?? gate)

  return (
    <div className="border-border bg-surface flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
      <p className="text-text-strong min-w-0 flex-1 text-sm font-medium">
        {isLoading ? t('loading') : next ? t('nextReviewName', { name: next.name }) : morePages ? t('nextNotFound') : t('queueDone')}
      </p>
      {!isLoading && (
        <Link
          to={next ? `${gatePath(next.gate)}/${next.id}` : queuePath}
          className="btn btn-press btn-primary min-h-11"
        >
          {t(next ? 'nextReview' : 'backToQueue')}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
