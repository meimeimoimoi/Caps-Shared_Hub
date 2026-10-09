import {
  changePricing,
  type PricingInput,
  type PricingWorkspace,
} from './model.ts'
const workspaces = new Map<string, PricingWorkspace>()
function seed(serviceId: string): PricingWorkspace {
  const review = serviceId === 'cit-review'
  const sequence = review ? 3 : 2
  const approved = {
    id: 'PR-' + String(sequence).padStart(3, '0'),
    sequence,
    status: 'APPROVED' as const,
    amount: review ? '750000' : '500000',
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
    reason: '',
    createdAt: '2026-08-25T03:00:00Z',
    updatedAt: '2026-08-28T03:00:00Z',
    reviewNote: null,
  }
  const pending = {
    ...approved,
    id: 'PR-004',
    sequence: 4,
    status: 'PENDING_APPROVAL' as const,
    amount: '850000',
    effectiveFrom: '2026-11-01',
    reason: 'Updated service fee for new bookings.',
    createdAt: '2026-10-01T03:00:00Z',
    updatedAt: '2026-10-01T03:00:00Z',
  }
  return {
    revision: 0,
    versions: review ? [pending, approved] : [approved],
    audit: [],
  }
}
export function getDemoPricing(scope: string, serviceId: string) {
  const key = JSON.stringify([scope, serviceId])
  if (!workspaces.has(key)) workspaces.set(key, seed(serviceId))
  return structuredClone(workspaces.get(key)!)
}
export function updateDemoPricing(
  scope: string,
  serviceId: string,
  input: PricingInput,
  options: Parameters<typeof changePricing>[2]
) {
  const result = changePricing(getDemoPricing(scope, serviceId), input, options)
  workspaces.set(JSON.stringify([scope, serviceId]), result)
  return structuredClone(result)
}
