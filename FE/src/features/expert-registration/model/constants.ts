import type { Stage, Profile } from './types'

export const steps = [
  'Personal information',
  'Professional experience',
  'Supporting documents',
  'Review and submit',
]

export const criteria = [
  'Legal eligibility',
  'Professional qualifications',
  'Continuing professional development',
  'Professional ethics',
  'Confidentiality',
]

export const labels: Record<Stage, string> = {
  screening: 'AI-assisted screening',
  eligibility: 'Eligibility review',
  additional: 'Additional information required',
  eligible: 'Eligibility approved',
  competency: 'Service competency review',
  final: 'Pending final approval',
  approved: 'Approved for service',
  ineligible: 'Not eligible',
  failed: 'Competency assessment failed',
  returned: 'Returned for review',
}

export const initial: Profile = {
  name: '',
  email: '',
  phone: '',
  birth: '',
  title: '',
  company: '',
  location: '',
  bio: '',
  years: '',
  highlights: '',
}
