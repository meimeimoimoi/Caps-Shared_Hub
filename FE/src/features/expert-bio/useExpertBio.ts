import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useAuthStore } from '@/features/auth'
import { useDemoAccountStore } from '@/features/auth/store/demoAccountStore'

// Proposed contract: GET /api/experts/{id}/bio is public, PUT /api/expert/me/bio is the expert's own.
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
  services: { serviceId: string; serviceName: string; price: string | null }[]
}

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

async function demoBio(expertId: string): Promise<ExpertBio> {
  // Chuyên gia mock của Sàn (id 1..8) dùng chung trang hồ sơ công khai này.
  const { EXPERTS, packagesFor } =
    await import('@/features/marketplace/fixtures')
  const listed = EXPERTS.find((e) => String(e.id) === expertId)
  if (listed)
    return {
      expertId,
      displayName: listed.name,
      avatarUrl: null,
      headline: listed.roleTitle,
      location: '',
      yearsOfExperience: listed.years,
      bio: listed.bio,
      expertise: listed.tags,
      highlights: [listed.desc],
      services: packagesFor(listed).map((p, i) => ({
        serviceId: `${expertId}-${i}`,
        serviceName: p.title,
        price: String(p.price),
      })),
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

const bioKey = (expertId: string) => ['public', 'expert-bio', expertId] as const

export function useExpertBio(expertId: string | undefined) {
  return useQuery({
    queryKey: bioKey(expertId ?? ''),
    queryFn: () =>
      isExpertDemo
        ? demoBio(expertId!)
        : api.get<ExpertBio>(
            `/api/experts/${encodeURIComponent(expertId!)}/bio`
          ),
    enabled: Boolean(expertId),
    retry: false,
  })
}

export function useSaveExpertBio(expertId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExpertBioInput) => {
      if (isExpertDemo) {
        demoInput = structuredClone(input)
        return demoBio(expertId)
      }
      return api.put<ExpertBio>('/api/expert/me/bio', input)
    },
    onSuccess: (data) => client.setQueryData(bioKey(expertId), data),
  })
}
