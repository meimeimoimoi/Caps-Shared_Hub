export const COMPETENCY_CODES = ['C1', 'C2', 'C3', 'C4', 'C5'] as const
export type CompetencyCode = (typeof COMPETENCY_CODES)[number]

