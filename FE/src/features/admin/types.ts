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
  document: string // mã tài liệu liên quan, vd. EV-03
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

export interface PageNote {
  kind: 'cite' | 'ai' | 'edit'
  label: string
  text: string
  /** Gắn với cờ AI → nút "Đánh dấu đã xem xét" dùng chung state với tab AI sàng lọc */
  flagId?: string
}

export interface DocumentPage {
  title?: string
  paragraphs: string[]
  notes: PageNote[]
}

export interface ApplicationDocument {
  code: string // CV, EV-01, ...
  name: string
  pages: DocumentPage[]
}

export interface ApplicationDetail extends ExpertApplication {
  birthDate: string
  jobTitle: string
  company: string
  location: string
  bio: string
  fields: string[]
  highlights: string
  screening: {
    ranAt: string
    rerunAt?: string
    checkedCount: number
    flags: AiFlag[]
    legalChecks: LegalCheck[]
  }
  documents: ApplicationDocument[]
  history: HistoryEntry[]
}

export type ReviewDecision = 'approve' | 'reject' | 'supplement'

/** actor = 'AI' cho thao tác của hệ thống AI, còn lại là tên người */
export interface HistoryEntry {
  at: string
  actor: string
  text: string
}

export interface DecisionRecord {
  kind: ReviewDecision
  at: string
  by: string
  note: string
}
