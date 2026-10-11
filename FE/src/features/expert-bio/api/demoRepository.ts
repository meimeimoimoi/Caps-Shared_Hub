import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/features/auth'
import { useDemoAccountStore } from '@/features/auth/store/demoAccountStore'
import type { ExpertBio, ExpertBioInput } from '../types'

// ponytail: in-memory demo store, resets on reload like pricing; real persistence needs the BE endpoint.
let demoInput: ExpertBioInput = {
  headline: 'Corporate income tax reviewer · Former Big Four tax senior',
  location: 'Ho Chi Minh City',
  yearsOfExperience: 9,
  bio: 'I review CIT finalisation drafts for manufacturing and trading companies, focusing on deductible expenses, related-party transactions and loss carryforwards. Every review cites the circular it relies on so your accountant can act on it directly.',
  expertise: ['Corporate income tax', 'Transfer pricing', 'Tax incentives'],
  highlights: [
    'Reviewed 140+ CIT finalisation files for FDI manufacturers',
    'Certified tax agent practising certificate (2019)',
  ],
}

export async function demoBio(expertId: string): Promise<ExpertBio> {
  // Chuyên gia mock của Sàn (id 1..8) dùng chung trang hồ sơ công khai này.
  const { findExpert, SERVICE_IDS, SERVICE_NAMES } =
    await import('@/features/marketplace/fixtures')
  const listed = findExpert(expertId)
  if (listed)
    return {
      expertId,
      displayName: listed.name,
      avatarUrl: listed.avatar ?? null,
      headline: listed.headline,
      location: listed.location,
      yearsOfExperience: listed.years,
      bio: listed.bio,
      expertise: listed.topics,
      highlights: listed.highlights,
      services: SERVICE_IDS.flatMap((id) => {
        const offer = listed.offers[id]
        return offer
          ? [
              {
                serviceId: id,
                serviceName: SERVICE_NAMES[id],
                price: String(offer.price),
                slaHours: offer.slaHours,
                pricingVersion: offer.pricingVersion,
                approvedAt: offer.approvedAt,
              },
            ]
          : []
      }),
      listing: {
        credential: listed.credential,
        rating: listed.rating,
        reviews: listed.reviews,
        completedCases: listed.completedCases,
        eligibleSince: listed.eligibleSince,
        availability: listed.availability,
      },
    }
  const [{ createExpertContextFixture }, { getDemoPricing }] =
    await Promise.all([
      import('@/features/expert-context/api/fixtures'),
      import('@/features/expert-pricing/demoRepository'),
    ])
  const context = createExpertContextFixture()
  if (expertId !== context.expertId) throw new ApiError('Expert not found', 404)
  const scope = context.expertId + ':' + useAuthStore.getState().sessionScope
  return {
    ...structuredClone(demoInput),
    expertId: context.expertId,
    displayName: context.displayName,
    avatarUrl: useDemoAccountStore.getState().avatarUrl ?? null,
    services: context.services
      .filter((s) => s.bookingAllowed)
      .map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        price:
          getDemoPricing(scope, s.serviceId).versions.find(
            (v) => v.status === 'APPROVED'
          )?.amount ?? null,
      })),
  }
}

export async function saveDemoBio(expertId: string, input: ExpertBioInput) {
  demoInput = structuredClone(input)
  return demoBio(expertId)
}
