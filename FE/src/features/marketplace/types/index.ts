/** Approved offer of one Expert–Service pair. */
export type ServiceOffer = {
  price: number
  /** Delivery SLA in calendar hours from START; null when the source has none. */
  slaHours: number | null
  pricingVersion: string
  /** When Gate 2 + Final Approval made this service bookable. */
  approvedAt: string | null
}

export type Availability =
  | {
      state: 'open'
      /** Demo listing: typical response time. */
      responseHours?: number
      /** API listing: earliest open availability slot. */
      nextSlotAt?: string | null
      slotCount?: number
    }
  | { state: 'full'; reopensAt: string }
  | { state: 'paused' }

/** One expert as the Marketplace shows them, whatever the data source. */
export type Expert = {
  id: string
  name: string
  initials: string
  /** Avatar URL; the UI falls back to initials */
  avatar?: string
  headline: string
  credential: string | null
  location: string | null
  years: number | null
  rating: number
  reviews: number
  completedCases: number | null
  /** Gate 1 (expert-level eligibility) PASS date; unknown in API mode. */
  eligibleSince: string | null
  availability: Availability
  /** Approved offers keyed by service id (fixture id or catalog service code). */
  offers: Partial<Record<string, ServiceOffer>>
  topics: string[]
  bio: string
  highlights: string[]
}

export type MarketplaceService = { id: string; name: string }

export type MarketplaceData = {
  services: MarketplaceService[]
  experts: Expert[]
}

/** GET /api/v1/marketplace/experts item (expert service, BR-M01). */
export interface MarketplaceExpertDto {
  expertId: string
  displayName: string | null
  title: string | null
  company: string | null
  location: string | null
  yearsExperience: number | null
  fields: string[]
  bio: string | null
  highlights: string | null
  ratingAvg: number
  ratingCount: number
  services: {
    serviceCode: string
    serviceName: string
    price: number
    pricingVersion: string
    /** Delivery SLA in calendar hours from START (service catalog, BR-M27). */
    slaHours: number
    approvedAt: string | null
  }[]
  nextOpenSlotAt: string | null
  openSlotCount: number
}
