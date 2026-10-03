import type { APPLICATION_STATUS } from '@/lib/constants'

export type ApplicationStatus = keyof typeof APPLICATION_STATUS

export interface ExpertApplication {
  id: string
  name: string
  email: string
  years: number
  aiFlags: number
  submittedAt: string
  status: ApplicationStatus
}

export interface AiFlag {
  id: string
  title: string
  detail: string
}

export interface LegalCheck {
  item: string
  result: 'declared' | 'present' | 'review'
  note: string
  document?: string
}

export interface Criterion {
  id: string
  name: string
  description: string
}

export interface ApplicationDetail extends ExpertApplication {
  phone: string
  jobTitle: string
  company: string
  bio: string
  screening: {
    ranAt: string
    rerunAt?: string
    checkedCount: number
    flags: AiFlag[]
    legalChecks: LegalCheck[]
  }
  documents: string[]
  history: { at: string; text: string }[]
}

export type ReviewDecision = 'approve' | 'reject' | 'supplement'
