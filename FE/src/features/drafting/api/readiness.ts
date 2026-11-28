import type { Assessment, DraftIssue } from '../types'

/** One issue as workflow returns it in `draftIssues` (DraftReadinessEvaluator) */
export interface DraftIssueDto {
  code: string
  type: string
  severity: string
  description: string
  fieldId?: string | null
  citationId?: string | null
}

/** A citation as stored on the version; ids in issues use the document number or the list index */
interface CitationRef {
  document_number?: string
  legal_source_id?: string
}

const RESULTS = ['READY', 'READY_WITH_WARNINGS', 'NOT_READY'] as const
type Result = (typeof RESULTS)[number]
const isResult = (v: string | null): v is Result =>
  RESULTS.includes(v as Result)

// Versions generated before readiness moved to the BE (PR #109) only carry this marker
const LEGACY_UNVERIFIED = 'AI_GENERATED_UNAUTHORIZED_NUMBERS'

/** Maps an issue's citation reference to the index id the draft view uses for citations */
function citationIndex(ref: string, citations: CitationRef[]) {
  const i = citations.findIndex(
    (c) => c.document_number === ref || c.legal_source_id === ref
  )
  if (i >= 0) return String(i)
  return /^\d+$/.test(ref) && Number(ref) < citations.length ? ref : undefined
}

/** Readiness verdict and issues of a draft version, read from what workflow computed */
export function toAssessment(
  draftAssessment: string | null,
  draftIssues: DraftIssueDto[] | null | undefined,
  citations: CitationRef[]
): Assessment {
  if (!isResult(draftAssessment)) {
    // Older versions were never assessed by the BE; keep the previous neutral verdict
    return {
      status: 'COMPLETED',
      result: 'READY_WITH_WARNINGS',
      checks: [],
      issues:
        draftAssessment === LEGACY_UNVERIFIED
          ? [
              {
                id: 'unverified-numbers',
                severity: 'warning',
                message: 'draftUnverifiedNumbers',
                guidance: 'draftVerifyAgainstInputs',
              },
            ]
          : [],
    }
  }
  const issues: DraftIssue[] = (draftIssues ?? []).map((issue, index) => ({
    id: `${issue.code}-${index}`,
    severity: issue.severity === 'BLOCKING' ? 'blocking' : 'warning',
    type: issue.type,
    message: issue.description,
    guidance: '',
    fieldId: issue.fieldId ?? undefined,
    citationId: issue.citationId
      ? citationIndex(issue.citationId, citations)
      : undefined,
  }))
  // Blocking issues first, as the verdict depends on them
  issues.sort(
    (a, b) =>
      Number(b.severity === 'blocking') - Number(a.severity === 'blocking')
  )
  return { status: 'COMPLETED', result: draftAssessment, checks: [], issues }
}
