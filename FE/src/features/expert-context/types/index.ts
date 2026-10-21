// Proposed read contract. Server is authoritative for portal access and booking readiness.
export interface ServiceReadiness {
  serviceId: string
  serviceName: string
  qualificationStatus: string
  serviceStatus: string
  availability: boolean
  bookingAllowed: boolean
  reasons: string[]
  pricing: {
    version: string
    effectiveFrom: string
    effectiveTo: string | null
  } | null
  pendingPricingVersion: string | null
}

export interface ExpertContext {
  /** Expert profile id; null before the first application is saved */
  expertId: string | null
  displayName: string
  /** Contact phone of the expert profile; null before it is saved */
  phone?: string | null
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
