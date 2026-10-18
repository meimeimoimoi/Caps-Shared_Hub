import type { Availability } from '@/features/marketplace/types'

export interface ExpertBioInput {
  headline: string
  location: string
  yearsOfExperience: number
  bio: string
  expertise: string[]
  highlights: string[]
}

export interface ExpertBio extends ExpertBioInput {
  expertId: string
  displayName: string
  avatarUrl: string | null
  /** Only services currently open for booking, with the approved fee in VND. */
  services: {
    serviceId: string
    serviceName: string
    price: string | null
    /** Delivery SLA in calendar hours from START; null when the source has none. */
    slaHours?: number | null
    pricingVersion?: string
    /** When Gate 2 + Final Approval made this service bookable. */
    approvedAt?: string | null
  }[]
  /** Marketplace standing; absent while the expert is not listed. */
  listing?: {
    credential: string | null
    rating: number
    reviews: number
    completedCases: number | null
    eligibleSince: string | null
    availability: Availability
    /** Full service catalog to show unapproved services too (demo only; the public API lists none). */
    catalog?: { serviceId: string; serviceName: string }[]
  }
}
