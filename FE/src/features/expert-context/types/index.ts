// Proposed read contract. Server is authoritative for portal access and booking readiness.
export interface ServiceReadiness {
  serviceId: string
  serviceName: string
  qualificationStatus: string
  serviceStatus: string
  availability: boolean
  bookingAllowed: boolean
  reasons: string[]
  /** The expert's own price for the service; null until one is set */
  pricing: {
    fee: number
    turnaroundHours: number
    updatedAt: string
  } | null
}

export interface ExpertContext {
  /** Expert profile id; null before the first application is saved */
  expertId: string | null
  displayName: string
  email: string
  accountStatus: string
  /** APPLICATION, SERVICE_SETUP or ACTIVE */
  stage: string
  /** Latest Gate 1 application status; null when none exists */
  applicationStatus: string | null
  portalAccess: {
    allowed: boolean
    reason: string | null
    capabilities: string[]
  }
  generatedAt: string
  version: string
  services: ServiceReadiness[]
}
