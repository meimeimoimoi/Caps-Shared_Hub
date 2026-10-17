import type {
  ApplicationDocument,
  EligibilityOutcome,
  EligibilityResult,
} from '../types'
export { foldVietnamese, formatDate, formatDateTime } from '@/lib/utils'

export const SLA_DAYS = 7
const DAY_MS = 86_400_000

export const waitedDays = (iso: string, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / DAY_MS)

/** Same rule as the server: any FAIL → NOT_ELIGIBLE, else any NEED_MORE_INFORMATION, else ELIGIBLE */
export function eligibilityOutcome(
  results: readonly (EligibilityResult | '')[]
): EligibilityOutcome {
  if (results.includes('FAIL')) return 'NOT_ELIGIBLE'
  if (results.includes('NEED_MORE_INFORMATION')) return 'NEED_MORE_INFORMATION'
  return 'ELIGIBLE'
}

/** Several files can share a code (e.g. two EV-02 files), so the evidence id comes first */
export const documentKey = (d: ApplicationDocument) => d.evidenceId ?? d.code
