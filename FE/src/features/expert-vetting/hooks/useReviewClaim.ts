import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'
import { claimApplication, releaseApplication } from '../api/adminApi'
import { claimQualification, releaseQualification } from '../api/qualificationApi'
import { adminKeys } from '../api/queryKeys'
import type { HistoryEntry, ReviewClaimEvent, ReviewClaimState } from '../types'

type Gate = 'GATE_1' | 'GATE_2'

/** Codes after which the page reloads the review to show who holds it now */
const CLAIM_CONFLICTS = ['REVIEW_CLAIMED', 'REVIEW_NOT_CLAIMED']

export const isClaimConflict = (e: unknown) =>
  e instanceof ApiError && !!e.code && CLAIM_CONFLICTS.includes(e.code)

/**
 * Claim of a Gate 1 application or Gate 2 qualification: take it, give it back, and its history as timeline
 * entries. A conflict (another reviewer won, or the claim expired) reloads the review so the page shows the
 * current holder.
 */
export function useReviewClaim(gate: Gate, id: string, state?: ReviewClaimState) {
  const { t } = useTranslation('admin')
  const qc = useQueryClient()
  const detailKey = gate === 'GATE_1' ? adminKeys.application(id) : adminKeys.qualification('review', id)

  const settle = {
    onSuccess: async (updated: unknown) => {
      qc.setQueryData(detailKey, updated)
      await qc.invalidateQueries({ queryKey: adminKeys.queueAll() })
    },
    onError: (e: unknown) => {
      if (isClaimConflict(e)) void qc.invalidateQueries({ queryKey: detailKey })
    },
  }
  const claim = useMutation({
    mutationFn: () => (gate === 'GATE_1' ? claimApplication(id) : claimQualification(id)),
    ...settle,
  })
  const release = useMutation({
    mutationFn: () => (gate === 'GATE_1' ? releaseApplication(id) : releaseQualification(id)),
    ...settle,
  })

  const who = (email: string | null) => email ?? t('claim.someone')
  const text = (e: ReviewClaimEvent) => {
    if (e.action === 'RELEASE') return t('claim.history.release')
    if (e.action === 'REASSIGN')
      return t('claim.history.reassign', { holder: who(e.holderEmail), reason: e.reason ?? '' })
    return e.previousHolderUserId
      ? t('claim.history.claimAfterExpiry', { previous: who(e.previousHolderEmail) })
      : t('claim.history.claim')
  }
  const history: HistoryEntry[] = (state?.history ?? []).map((e) => ({
    at: e.at,
    actor: e.actorEmail ?? '',
    text: text(e),
  }))

  const current = state?.current ?? null
  return {
    current,
    canClaim: !!state?.canClaim && !current?.heldByMe,
    heldByMe: !!current?.heldByMe,
    /** Someone else holds it: the page is read only */
    heldByOther: !!current && !current.heldByMe,
    claim: () => claim.mutateAsync(),
    release: () => release.mutateAsync(),
    pending: claim.isPending || release.isPending,
    history,
  }
}
