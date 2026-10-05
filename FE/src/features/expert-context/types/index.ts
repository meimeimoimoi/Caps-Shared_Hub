// Proposed read contract. Server is authoritative for portal access and booking readiness.
export interface ServiceReadiness {
  serviceId: string
  serviceName: string
  qualificationStatus: string
  serviceStatus: string
  availability: boolean
  bookingAllowed: boolean
  reasons: string[]
  pricing: { version: string; effectiveFrom: string; effectiveTo: string | null } | null
  pendingPricingVersion: string | null
}

export interface ExpertContext {
  expertId: string
  displayName: string
  email: string
  accountStatus: string
  portalAccess: { allowed: boolean; reason: string | null; capabilities: string[] }
  generatedAt: string
  version: string
  services: ServiceReadiness[]
}
