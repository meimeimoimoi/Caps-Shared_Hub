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
