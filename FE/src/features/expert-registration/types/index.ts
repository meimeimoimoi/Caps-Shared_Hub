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

/** Evidence file or public link saved on the server (or being uploaded). */
export interface EvidenceFile {
  /** Empty while uploading. */
  id: string
  name: string
  size: number
  canRemove: boolean
  sourceUrl?: string | null
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
}
