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
