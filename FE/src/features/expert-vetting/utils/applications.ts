import type {
  ApplicationDocument,
  Submission,
  CompetencyOutcome,
  CompetencyResult,
  EligibilityOutcome,
  EligibilityResult,
} from '../types'
export { foldVietnamese, formatDate, formatDateTime } from '@/lib/utils'

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

/** Same rule as the server: any FAIL → FAIL, else any NEED_MORE_INFORMATION, else PENDING_FINAL_APPROVAL */
export function competencyOutcome(
  results: readonly (CompetencyResult | '')[]
): CompetencyOutcome {
  if (results.includes('FAIL')) return 'FAIL'
  if (results.includes('NEED_MORE_INFORMATION')) return 'NEED_MORE_INFORMATION'
  return 'PENDING_FINAL_APPROVAL'
}

/** Several files can share a code (e.g. two EV-02 files), so the evidence id comes first */
export const documentKey = (d: ApplicationDocument) => d.evidenceId ?? d.code

/** Documents of one submission, or added after the latest one (number null) */
export interface SubmissionDocuments {
  number: number | null
  submittedAt: string | null
  documents: ApplicationDocument[]
}

/**
 * Places each document in the submission that sent it (S19 Step 2): submitted files cannot be removed, so a
 * file belongs to the first submission made at or after its upload. Files added after the latest submission
 * (while more information is requested) form their own group. Newest submission first, because a reviewer
 * re-checking an application looks for what changed.
 */
export function documentsBySubmission(
  documents: ApplicationDocument[],
  submissions: Submission[]
): SubmissionDocuments[] {
  const ordered = [...submissions].sort(
    (a, b) =>
      new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  )
  const groups = new Map<number | null, ApplicationDocument[]>()
  for (const d of documents) {
    const at = d.uploadedAt ? new Date(d.uploadedAt).getTime() : null
    const sent =
      at == null
        ? ordered[0]
        : ordered.find((s) => new Date(s.submittedAt).getTime() >= at)
    const number = sent?.number ?? null
    groups.set(number, [...(groups.get(number) ?? []), d])
  }
  return [...groups.entries()]
    .map(([number, docs]) => ({
      number,
      submittedAt:
        ordered.find((s) => s.number === number)?.submittedAt ?? null,
      documents: docs,
    }))
    .sort((a, b) => (b.number ?? Infinity) - (a.number ?? Infinity))
}
