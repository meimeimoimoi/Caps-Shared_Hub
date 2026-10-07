import type {
  ReviewerActor,
  ReviewPolicy,
  ReviewerState,
  ReviewRecord,
} from './domain'

export const demoActor: ReviewerActor = {
  id: 'reviewer-demo',
  name: 'Demo Reviewer',
  permissions: ['GATE_1', 'GATE_2'],
}
export const demoPolicy: ReviewPolicy = {
  version: 'POL-EXP / DEMO-v1',
  minimumExperience: 5,
  gate1CooldownDays: 30,
  gate2CooldownDays: 90,
  competencyConfigured: false,
}
const evidence: ReviewRecord['evidence'] = [
  {
    id: 'E-01',
    title: 'Application extract · synthetic',
    excerpt:
      'Demo application: identity and residency evidence are listed for reviewer inspection. This is an illustrative text extract, not an uploaded identity document.',
  },
  {
    id: 'E-02',
    title: 'Professional evidence · synthetic',
    excerpt:
      'Demo credential and continuing education summaries. A real review must verify validity, issuer and applicability against the configured policy.',
  },
  {
    id: 'E-03',
    title: 'Experience statement · synthetic',
    excerpt:
      'Demo tax/accounting work history and service evidence. Years and CV keywords alone do not prove the required competencies.',
  },
  {
    id: 'E-04',
    title: 'Professional commitments · synthetic',
    excerpt:
      'Demo declarations covering professional ethics and confidentiality. These excerpts are not evidence of a real person’s eligibility.',
  },
]
export function initialReviewerState(): ReviewerState {
  const rows: [
    string,
    string,
    number,
    ReviewRecord['gate'],
    ReviewRecord['status'],
    string[],
  ][] = [
    [
      'RV-1001',
      'Demo Applicant A',
      8,
      'GATE_1',
      'PENDING_REVIEW',
      ['Evidence discrepancy requires human verification.'],
    ],
    [
      'RV-1002',
      'Demo Applicant B',
      6,
      'GATE_1',
      'NEED_MORE_INFORMATION',
      ['Updated supporting evidence is pending.'],
    ],
    [
      'RV-1003',
      'Demo Applicant C',
      3,
      'GATE_1',
      'PENDING_REVIEW',
      ['Declared experience is below the demo policy threshold.'],
    ],
    ['RV-2001', 'Demo Applicant D', 10, 'GATE_2', 'PENDING_REVIEW', []],
    ['RV-2002', 'Demo Applicant E', 7, 'GATE_2', 'PENDING_REVIEW', []],
  ]
  return {
    records: rows.map(
      ([id, name, experienceYears, gate, status, flags], index) => ({
        id,
        name,
        experienceYears,
        gate,
        status,
        flags,
        expertId: `EXP-DEMO-${index + 1}`,
        applicationId: `APP-DEMO-${index + 1}`,
        assignedTo: demoActor.id,
        gate1Passed: gate === 'GATE_2',
        serviceId: 'cit-document-review',
        serviceLabel: 'CIT document verification · demo',
        submittedAt: `2026-10-0${index + 1}T03:00:00.000Z`,
        evidence: structuredClone(evidence),
      })
    ),
    drafts: {},
    history: [],
  }
}
