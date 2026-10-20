export type Stage =
  | 'screening'
  | 'eligibility'
  | 'additional'
  | 'eligible'
  | 'competency'
  | 'final'
  | 'approved'
  | 'ineligible'
  | 'failed'
  | 'returned'

/** File minh chứng đã lưu trên máy chủ (hoặc đang tải lên) */
export interface EvidenceFile {
  /** Rỗng khi đang tải lên */
  id: string
  name: string
  size: number
  canRemove: boolean
  uploading?: boolean
}

export interface Profile {
  name: string
  email: string
  phone: string
  birth: string
  title: string
  company: string
  location: string
  bio: string
  years: string
  highlights: string
}

/** How many files the whole application may hold now; the limit rises once the email is verified. */
export interface UploadQuota {
  used: number
  max: number
  verified: boolean
  /** Opens the email verification dialog */
  onVerify: () => void
}
