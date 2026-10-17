import type { Availability } from '@/features/marketplace/fixtures'

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
    /** Delivery SLA in calendar hours, from the approved pricing version. */
    slaHours?: number | null
    pricingVersion?: string
    /** When Gate 2 + Final Approval made this service bookable. */
    approvedAt?: string
  }[]
  /** Marketplace standing; absent while the expert is not listed. */
  listing?: {
    credential: string
    rating: number
    reviews: number
    completedCases: number
    eligibleSince: string
    availability: Availability
  }
}
