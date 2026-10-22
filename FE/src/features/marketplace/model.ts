import type { ExpertBio } from '@/features/expert-bio/types'
import type {
  Expert,
  MarketplaceData,
  MarketplaceExpertDto,
  MarketplaceService,
  ServiceOffer,
} from './types'

/* Pure Marketplace rules shared by the demo fixtures and the expert service API. */

export type Listing = { expert: Expert; offer: ServiceOffer }

/** Family name + given name initials, ignoring a leading title ("LS. Vũ Trọng Nghĩa" → "VN"). */
export function initialsOf(name: string) {
  const parts = name
    .replace(/^(ThS|TS|LS)\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase()
}

/** Highlights are free text on the profile: one item per line. */
const splitLines = (text: string | null) =>
  (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)

// Vietnam has no daylight saving time; approval dates are business dates in UTC+7, as in the expert service
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000

/** Approval timestamp → its business date (YYYY-MM-DD) for date-only display. */
export function businessDate(iso: string | null) {
  const time = iso ? Date.parse(iso) : NaN
  return Number.isFinite(time)
    ? new Date(time + VIETNAM_OFFSET_MS).toISOString().slice(0, 10)
    : null
}

const headlineOf = (dto: MarketplaceExpertDto) =>
  [dto.title, dto.company].filter(Boolean).join(' · ')

export function expertFromDto(dto: MarketplaceExpertDto): Expert {
  const name = dto.displayName?.trim() || dto.expertId
  return {
    id: dto.expertId,
    name,
    initials: initialsOf(name),
    headline: headlineOf(dto),
    credential: null,
    location: dto.location,
    years: dto.yearsExperience,
    rating: dto.ratingAvg,
    reviews: dto.ratingCount,
    completedCases: null,
    eligibleSince: null,
    // BR-M01 only lists experts with an open slot, so every listed expert can take a request
    availability: {
      state: 'open',
      nextSlotAt: dto.nextOpenSlotAt,
      slotCount: dto.openSlotCount,
    },
    offers: Object.fromEntries(
      dto.services.map((s) => [
        s.serviceCode,
        {
          price: s.price,
          slaHours: s.slaHours,
          approvedAt: businessDate(s.approvedAt),
        },
      ])
    ),
    topics: dto.fields,
    bio: dto.bio ?? '',
    highlights: splitLines(dto.highlights),
  }
}

/** Services in the order they first appear; the public API has no catalog endpoint. */
export function marketplaceFromDtos(
  dtos: MarketplaceExpertDto[]
): MarketplaceData {
  const services = new Map<string, MarketplaceService>()
  for (const s of dtos.flatMap((d) => d.services))
    if (!services.has(s.serviceCode))
      services.set(s.serviceCode, { id: s.serviceCode, name: s.serviceName })
  return { services: [...services.values()], experts: dtos.map(expertFromDto) }
}

/** Public profile contract shared with the expert's own bio preview. */
export function bioFromDto(dto: MarketplaceExpertDto): ExpertBio {
  const expert = expertFromDto(dto)
  return {
    expertId: expert.id,
    displayName: expert.name,
    avatarUrl: null,
    headline: expert.headline,
    location: expert.location ?? '',
    yearsOfExperience: expert.years ?? 0,
    bio: expert.bio,
    expertise: expert.topics,
    highlights: expert.highlights,
    services: dto.services.map((s) => ({
      serviceId: s.serviceCode,
      serviceName: s.serviceName,
      price: String(s.price),
      slaHours: s.slaHours,
      approvedAt: businessDate(s.approvedAt),
    })),
    listing: {
      credential: null,
      rating: expert.rating,
      reviews: expert.reviews,
      completedCases: null,
      eligibleSince: null,
      availability: expert.availability,
    },
  }
}

/** Experts approved for one service, with that service's offer. */
export const listingsFor = (experts: Expert[], service: string): Listing[] =>
  experts.flatMap((expert) => {
    const offer = expert.offers[service]
    return offer ? [{ expert, offer }] : []
  })

/** Requests can only be sent while the expert is taking work (availability at search time). */
export const canRequest = (e: Expert) => e.availability.state === 'open'

const offersOf = (e: Expert) =>
  Object.values(e.offers).filter((o): o is ServiceOffer => o != null)

/** Lowest fee across the expert's approved services */
export const lowestFee = (e: Expert) =>
  Math.min(...offersOf(e).map((offer) => offer.price))

/** True when at least one offer carries a Delivery SLA. */
export const hasDeliverySla = (experts: Expert[]) =>
  experts.some((e) => offersOf(e).some((o) => o.slaHours != null))

/** Per-service facts for the service picker: expert count, lowest fee, fastest SLA. */
export function serviceFacts(data: MarketplaceData) {
  return data.services.map((service) => {
    const offers = listingsFor(data.experts, service.id).map((l) => l.offer)
    const slas = offers.flatMap((o) => (o.slaHours == null ? [] : [o.slaHours]))
    return {
      ...service,
      count: offers.length,
      from: offers.length ? Math.min(...offers.map((o) => o.price)) : null,
      fastest: slas.length ? Math.min(...slas) : null,
    }
  })
}

/** Best-rated experts taking work (excluding excludeId when given) */
export const featuredExperts = (
  experts: Expert[],
  count: number,
  excludeId?: string
) =>
  experts
    .filter((e) => canRequest(e) && e.id !== excludeId)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, count)
