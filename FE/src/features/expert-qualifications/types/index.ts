/** Expert-Service qualification status (Gate 2 and final approval) */
export type QualificationStatus =
  | 'COMPETENCY_REVIEW'
  | 'NEED_MORE_INFORMATION'
  | 'PENDING_FINAL_APPROVAL'
  | 'APPROVED_FOR_SERVICE'
  | 'SUSPENDED'
  | 'FAIL'

export type CompetencyResult = 'PASS' | 'FAIL' | 'NEED_MORE_INFORMATION'

/** One active catalog service with the expert's latest qualification for it */
export interface ServiceQualification {
  serviceCode: string
  serviceName: string
  qualificationId: string | null
  status: QualificationStatus | null
  submittedAt: string | null
  /** After FAIL: when the service can be registered again */
  earliestReapplyAt: string | null
  canRegister: boolean
}

export interface QualificationOverview {
  /** Latest Gate 1 application status; null when none exists */
  eligibilityStatus: string | null
  eligible: boolean
  services: ServiceQualification[]
}

export interface QualificationFile {
  id: string
  code: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  canRemove: boolean
}

export interface Qualification {
  id: string
  serviceCode: string
  serviceName: string
  status: QualificationStatus
  submittedAt: string
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  previousQualificationId: string | null
  createdAt: string
  /** Gate 1 files first, then files added for this service (code COMPETENCY) */
  evidence: QualificationFile[]
  history: {
    fromStatus: QualificationStatus | null
    toStatus: QualificationStatus
    note: string | null
    at: string
    byApplicant: boolean
  }[]
  /** Per-competency results of the latest Gate 2 decision */
  competencies: {
    code: string
    result: CompetencyResult
    note: string
    evidenceIds: string[]
    decidedAt: string
  }[]
  canUpload: boolean
  canSupplement: boolean
  maxFiles: number
}
