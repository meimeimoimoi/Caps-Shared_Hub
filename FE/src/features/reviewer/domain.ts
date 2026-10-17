export type Gate = 'GATE_1' | 'GATE_2'
export type Decision =
  'PASS' | 'NEED_MORE_INFORMATION' | 'NOT_ELIGIBLE' | 'FAIL'
export type ReviewStatus =
  | 'PENDING_REVIEW'
  | 'NEED_MORE_INFORMATION'
  | 'PASSED'
  | 'NOT_ELIGIBLE'
  | 'FAILED'
  | 'PENDING_FINAL_APPROVAL'
export const eligibilityIds = [
  'EV-01',
  'EV-02',
  'EV-03',
  'EV-04',
  'EV-05',
  'EV-06',
] as const
export const competencyIds = ['C1', 'C2', 'C3', 'C4', 'C5'] as const
export interface Evidence {
  id: string
  title: string
  excerpt: string
}
export interface ReviewRecord {
  id: string
  expertId: string
  applicationId: string
  name: string
  experienceYears: number
  gate: Gate
  serviceId: string
  serviceLabel: string
  gate1Passed: boolean
  assignedTo: string
  submittedAt: string
  status: ReviewStatus
  evidence: Evidence[]
  flags: string[]
}
export interface Assessment {
  result: '' | 'PASS' | 'NEED_MORE_INFORMATION' | 'FAIL'
  evidenceId: string
  note: string
}
export interface ReviewDraft {
  assessments: Record<string, Assessment>
  outcome: '' | Decision
  note: string
  flagsResolved: boolean
}
export interface ReviewerActor {
  id: string
  name: string
  permissions: Gate[]
}
export interface ReviewPolicy {
  version: string
  minimumExperience: number
  gate1CooldownDays: number
  gate2CooldownDays: number
  competencyConfigured: boolean
}
export interface AuditEntry {
  id: string
  recordId: string
  applicationId: string
  expertId: string
  expertName: string
  serviceId: string | null
  gate: Gate
  decision: Decision
  actorId: string
  actorName: string
  at: string
  policy: ReviewPolicy
  draft: ReviewDraft
  evidence: Evidence[]
  earliestReapplyAt?: string
}
export interface ReviewerState {
  records: ReviewRecord[]
  drafts: Record<string, ReviewDraft>
  history: AuditEntry[]
}
export type ReviewError =
  | 'permission'
  | 'closed'
  | 'gate1Required'
  | 'policyMissing'
  | 'incomplete'
  | 'invalidDecision'
  | 'experience'
  | 'evidence'
  | 'flags'

export function blankDraft(gate: Gate): ReviewDraft {
  return {
    assessments: Object.fromEntries(
      (gate === 'GATE_1' ? eligibilityIds : competencyIds).map((id) => [
        id,
        { result: '', evidenceId: '', note: '' },
      ])
    ),
    outcome: '',
    note: '',
    flagsResolved: false,
  }
}
export function reviewAccess(
  record: ReviewRecord,
  actor: ReviewerActor
): ReviewError | null {
  if (
    record.assignedTo !== actor.id ||
    !actor.permissions.includes(record.gate)
  )
    return 'permission'
  if (!['PENDING_REVIEW', 'NEED_MORE_INFORMATION'].includes(record.status))
    return 'closed'
  if (record.gate === 'GATE_2' && !record.gate1Passed) return 'gate1Required'
  return null
}
export function validateDecision(
  record: ReviewRecord,
  draft: ReviewDraft,
  actor: ReviewerActor,
  policy: ReviewPolicy
): ReviewError | null {
  const denied = reviewAccess(record, actor)
  if (denied) return denied
  if (record.gate === 'GATE_2' && !policy.competencyConfigured)
    return 'policyMissing'
  const ids = record.gate === 'GATE_1' ? eligibilityIds : competencyIds
  const rows = ids.map((id) => draft.assessments[id])
  if (
    !draft.outcome ||
    !draft.note.trim() ||
    rows.some(
      (row) => !row || !row.result || !row.note.trim() || !row.evidenceId
    )
  )
    return 'incomplete'
  if (
    rows.some(
      (row) =>
        !record.evidence.some((evidence) => evidence.id === row.evidenceId)
    )
  )
    return 'evidence'
  const negative = record.gate === 'GATE_1' ? 'NOT_ELIGIBLE' : 'FAIL'
  if (![negative, 'PASS', 'NEED_MORE_INFORMATION'].includes(draft.outcome))
    return 'invalidDecision'
  if (draft.outcome === 'PASS' && rows.some((row) => row.result !== 'PASS'))
    return 'invalidDecision'
  if (draft.outcome === 'PASS' && record.flags.length && !draft.flagsResolved)
    return 'flags'
  if (draft.outcome === negative && !rows.some((row) => row.result === 'FAIL'))
    return 'invalidDecision'
  if (
    draft.outcome === 'NEED_MORE_INFORMATION' &&
    (!rows.some((row) => row.result === 'NEED_MORE_INFORMATION') ||
      rows.some((row) => row.result === 'FAIL'))
  )
    return 'invalidDecision'
  if (
    record.gate === 'GATE_1' &&
    record.experienceYears < policy.minimumExperience &&
    (draft.outcome !== 'NOT_ELIGIBLE' ||
      draft.assessments['EV-06'].result !== 'FAIL')
  )
    return 'experience'
  return null
}
/** Demo transition only: no API, persistence, final approval or AI decision. */
export function submitDecision(
  state: ReviewerState,
  recordId: string,
  draft: ReviewDraft,
  actor: ReviewerActor,
  policy: ReviewPolicy,
  now: string
): { state: ReviewerState; error: ReviewError | null } {
  const record = state.records.find((item) => item.id === recordId)
  if (!record) return { state, error: 'permission' }
  const error = validateDecision(record, draft, actor, policy)
  if (error) return { state, error }
  const outcome = draft.outcome as Decision
  const status: ReviewStatus =
    outcome === 'PASS'
      ? record.gate === 'GATE_1'
        ? 'PASSED'
        : 'PENDING_FINAL_APPROVAL'
      : outcome === 'FAIL'
        ? 'FAILED'
        : outcome
  const cooldown =
    outcome === 'NOT_ELIGIBLE'
      ? policy.gate1CooldownDays
      : outcome === 'FAIL'
        ? policy.gate2CooldownDays
        : 0
  const entry: AuditEntry = {
    id: `AUD-${state.history.length + 1}`,
    recordId,
    applicationId: record.applicationId,
    expertId: record.expertId,
    expertName: record.name,
    serviceId: record.gate === 'GATE_2' ? record.serviceId : null,
    gate: record.gate,
    decision: outcome,
    actorId: actor.id,
    actorName: actor.name,
    at: now,
    policy: { ...policy },
    draft: structuredClone(draft),
    evidence: structuredClone(record.evidence),
    ...(cooldown
      ? {
          earliestReapplyAt: new Date(
            Date.parse(now) + cooldown * 86400000
          ).toISOString(),
        }
      : {}),
  }
  const records = state.records.map((item) =>
    item.id === recordId ? { ...item, status } : item
  )
  // One qualification for the explicitly requested service; never approve other services.
  if (record.gate === 'GATE_1' && outcome === 'PASS')
    records.push({
      ...structuredClone(record),
      id: `${record.id}-G2-${record.serviceId}`,
      gate: 'GATE_2',
      gate1Passed: true,
      status: 'PENDING_REVIEW',
      submittedAt: now,
    })
  const drafts = { ...state.drafts }
  delete drafts[recordId]
  return {
    state: { records, drafts, history: [...state.history, entry] },
    error: null,
  }
}
