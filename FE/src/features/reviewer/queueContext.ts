import type { ClaimFilter } from '@/features/expert-vetting/api/reviewQueueApi'

/** The queue view a reviewer opened a review from, so "next review" follows the same filters and order */
export interface QueueContext {
  gate: string
  search: string
  claim: ClaimFilter
  sortBy: string
  sortDescending: boolean
}

const KEY = 'reviewer.queueContext'

export function saveQueueContext(context: QueueContext) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context))
  } catch {
    // Storage can be blocked; "next review" then falls back to the default queue order
  }
}

export function readQueueContext(): QueueContext | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QueueContext) : null
  } catch {
    return null
  }
}
