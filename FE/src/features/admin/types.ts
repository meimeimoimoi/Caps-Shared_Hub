export type ApplicationStatus =
  | 'pending'
  | 'reconciling'
  | 'supplement'
  | 'ineligible'
  | 'processed'

export interface ExpertApplication {
  id: string
  name: string
  email: string
  years: number
  aiFlags: number
  submittedAt: string
  status: ApplicationStatus
}
