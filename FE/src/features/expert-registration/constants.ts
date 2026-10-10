import type { Stage, Profile } from './types'

export const steps = [
  'personal.heading',
  'experience.heading',
  'documents.heading',
  'review.heading',
] as const

// Nhãn ngắn một dòng cho thanh bước; tên đầy đủ (steps) vẫn dùng cho tiêu đề và trình đọc màn hình
export const stepShortLabels = [
  'stepper.personal',
  'stepper.experience',
  'stepper.documents',
  'stepper.review',
] as const

export const criteria: readonly string[] = [
  'Legal eligibility',
  'Professional qualifications',
  'Continuing professional development',
  'Professional ethics',
  'Confidentiality',
] as const

export const labels = {
  screening: 'stages.screening',
  eligibility: 'stages.eligibility',
  additional: 'stages.additional',
  eligible: 'stages.eligible',
  competency: 'stages.competency',
  final: 'stages.final',
  approved: 'stages.approved',
  ineligible: 'stages.ineligible',
  failed: 'stages.failed',
  returned: 'stages.returned',
} as const satisfies Record<Stage, string>

const criterionKeys = {
  'Legal eligibility': 'criteria.legal',
  'Professional qualifications': 'criteria.qualifications',
  'Continuing professional development': 'criteria.development',
  'Professional ethics': 'criteria.ethics',
  Confidentiality: 'criteria.confidentiality',
} as const
export function criterionKey(value: string) {
  return Object.hasOwn(criterionKeys, value)
    ? criterionKeys[value as keyof typeof criterionKeys]
    : undefined
}
export const expertiseOptions = [
  'Corporate income tax',
  'Tax finalization',
  'Corporate accounting',
  'Financial reporting',
  'Audit',
  'Tax advisory',
] as const
const expertiseKeys = {
  'Corporate income tax': 'expertise.cit',
  'Tax finalization': 'expertise.finalization',
  'Corporate accounting': 'expertise.accounting',
  'Financial reporting': 'expertise.reporting',
  Audit: 'expertise.audit',
  'Tax advisory': 'expertise.advisory',
} as const
export function expertiseKey(value: string) {
  return Object.hasOwn(expertiseKeys, value)
    ? expertiseKeys[value as keyof typeof expertiseKeys]
    : undefined
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

/** 34 tỉnh, thành phố sau sắp xếp đơn vị hành chính (hiệu lực 01/07/2025). */
export const provinces: readonly string[] = [
  'Hà Nội',
  'Huế',
  'Hải Phòng',
  'Đà Nẵng',
  'Hồ Chí Minh',
  'Cần Thơ',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
].sort(new Intl.Collator('vi').compare)
