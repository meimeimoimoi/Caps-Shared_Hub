import { api } from '@/lib/api-client'
import { criteria, expertiseOptions } from '../constants'
import type { EvidenceFile, Profile, Stage } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/** Trạng thái hồ sơ phía BE (trùng APPLICATION_STATUS của màn duyệt admin) */
export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AI_SCREENING'
  | 'NEED_MORE_INFORMATION'
  | 'NOT_ELIGIBLE'
  | 'ELIGIBLE'
  | 'CAPABILITY_REVIEW'
  | 'APPROVED'
  | 'REJECTED'

export interface ExpertApplication {
  id: string
  status: ApplicationStatus
  submittedAt: string | null
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  profile: {
    displayName: string
    email: string
    phone: string | null
    birthDate: string | null
    title: string | null
    company: string | null
    location: string | null
    bio: string | null
    yearsExperience: number | null
    fields: string[]
    highlights: string | null
  }
  evidence: {
    id: string
    code: string
    fileName: string
    contentType: string
    sizeBytes: number
    uploadedAt: string
    canRemove: boolean
  }[]
  history: {
    fromStatus: ApplicationStatus | null
    toStatus: ApplicationStatus
    note: string | null
    at: string
    byApplicant: boolean
  }[]
  /** Per-requirement results of the latest Gate 1 decision (EV-01…EV-06) */
  eligibility: {
    code: string
    result: 'PASS' | 'FAIL' | 'NEED_MORE_INFORMATION'
    note: string | null
    decidedAt: string
  }[]
  missingRequirements: string[]
  emailVerified: boolean
  canEdit: boolean
  canUpload: boolean
  canSubmit: boolean
  canSupplement: boolean
  /** Files the application may hold now (lower until the email is verified) */
  maxFiles: number
}

/* FE giữ khóa tiêu chí/lĩnh vực theo nhãn tiếng Anh (dùng cho i18n); BE dùng mã cố định */
const CRITERION_CODES: Record<string, string> = Object.fromEntries([
  ['CV', 'CV'],
  ...criteria.map((c, i) => [c, `EV-0${i + 1}`]),
])
const FIELD_CODES: Record<string, string> = {
  'Corporate income tax': 'CORPORATE_INCOME_TAX',
  'Tax finalization': 'TAX_FINALIZATION',
  'Corporate accounting': 'CORPORATE_ACCOUNTING',
  'Financial reporting': 'FINANCIAL_REPORTING',
  Audit: 'AUDIT',
  'Tax advisory': 'TAX_ADVISORY',
} satisfies Record<(typeof expertiseOptions)[number], string>

export const SUPPLEMENT_CODE = 'SUPPLEMENT'

const invert = (map: Record<string, string>) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
const CRITERION_BY_CODE = invert(CRITERION_CODES)
const FIELD_BY_CODE = invert(FIELD_CODES)

export const evidenceCode = (criterion: string) =>
  CRITERION_CODES[criterion] ?? criterion

/** Form criterion for an EV code (EV-06, the declared experience, has no evidence group) */
export const criterionOf = (code: string): string | undefined =>
  CRITERION_BY_CODE[code]

/** Màn trạng thái của ứng viên dùng các giai đoạn (Stage) chi tiết hơn trạng thái BE */
export function stageOf(status: ApplicationStatus): Stage {
  switch (status) {
    case 'NEED_MORE_INFORMATION':
      return 'additional'
    case 'NOT_ELIGIBLE':
      return 'ineligible'
    case 'ELIGIBLE':
      return 'eligible'
    case 'CAPABILITY_REVIEW':
      return 'competency'
    case 'APPROVED':
      return 'approved'
    case 'REJECTED':
      return 'failed'
    // Only when AI screening exists; until then a submitted application goes straight to Gate 1
    case 'AI_SCREENING':
      return 'screening'
    default:
      return 'eligibility'
  }
}

export function toProfile(app: ExpertApplication): Profile {
  const p = app.profile
  return {
    name: p.displayName,
    email: p.email,
    phone: p.phone ?? '',
    birth: p.birthDate ?? '',
    title: p.title ?? '',
    company: p.company ?? '',
    location: p.location ?? '',
    bio: p.bio ?? '',
    years: p.yearsExperience == null ? '' : String(p.yearsExperience),
    highlights: p.highlights ?? '',
  }
}

export const toFields = (app: ExpertApplication) =>
  app.profile.fields.map((code) => FIELD_BY_CODE[code] ?? code)

/** Gom file theo tiêu chí như form đang dùng; file bổ sung nằm riêng dưới mã SUPPLEMENT */
export function toFiles(
  app: ExpertApplication
): Record<string, EvidenceFile[]> {
  const files: Record<string, EvidenceFile[]> = {}
  for (const e of app.evidence) {
    const key = CRITERION_BY_CODE[e.code] ?? e.code
    ;(files[key] ??= []).push({
      id: e.id,
      name: e.fileName,
      size: e.sizeBytes,
      canRemove: e.canRemove,
    })
  }
  return files
}

const BASE = '/api/v1/experts/me/application'

export const applicationApi = {
  file: (id: string) =>
    api.get<Blob>(`${BASE}/evidence/${encodeURIComponent(id)}/file`, {
      responseType: 'blob',
      timeout: 60_000,
    }),
  /** null = chưa từng tạo hồ sơ */
  get: async () =>
    (await api.get<Envelope<ExpertApplication | null>>(BASE)).data,
  save: async (profile: Profile, fields: string[]) =>
    (
      await api.put<Envelope<ExpertApplication>>(BASE, {
        displayName: profile.name.trim() || null,
        phone: profile.phone.trim() || null,
        birthDate: profile.birth || null,
        title: profile.title,
        company: profile.company,
        location: profile.location,
        bio: profile.bio,
        yearsExperience: profile.years === '' ? null : Number(profile.years),
        fields: fields.map((f) => FIELD_CODES[f] ?? f),
        highlights: profile.highlights,
      })
    ).data,
  upload: async (code: string, file: File) => {
    const body = new FormData()
    body.append('code', code)
    body.append('file', file)
    return (
      await api.post<Envelope<ExpertApplication>>(`${BASE}/evidence`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
    ).data
  },
  remove: async (id: string) =>
    (await api.del<Envelope<ExpertApplication>>(`${BASE}/evidence/${id}`)).data,
  submit: async () =>
    (await api.post<Envelope<ExpertApplication>>(`${BASE}/submit`)).data,
  supplement: async (note: string) =>
    (
      await api.post<Envelope<ExpertApplication>>(`${BASE}/supplement`, {
        note,
      })
    ).data,
}
