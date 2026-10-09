import type { ExpertContext } from '../types'

export function createExpertContextFixture(): ExpertContext {
  return {
    expertId: 'demo-expert', displayName: 'Minh Anh Nguyen', email: 'minhanh@example.test',
    accountStatus: 'ACTIVE', portalAccess: { allowed: true, reason: null, capabilities: ['expert.overview.read'] },
    generatedAt: new Date().toISOString(), version: 'demo-v1',
    services: [
      { serviceId: 'cit-review', serviceName: 'CIT draft verification', qualificationStatus: 'APPROVED_FOR_SERVICE', serviceStatus: 'ACTIVE', availability: true, bookingAllowed: true, reasons: [], pricing: { version: 'PR-003', effectiveFrom: '2026-09-01T00:00:00Z', effectiveTo: null }, pendingPricingVersion: 'PR-004' },
      { serviceId: 'cit-consultation', serviceName: 'CIT consultation', qualificationStatus: 'APPROVED_FOR_SERVICE', serviceStatus: 'ACTIVE', availability: false, bookingAllowed: false, reasons: ['Availability is off for this service. Existing cases remain accessible.'], pricing: { version: 'PR-002', effectiveFrom: '2026-09-01T00:00:00Z', effectiveTo: null }, pendingPricingVersion: null },
      { serviceId: 'cit-compliance', serviceName: 'CIT compliance assessment', qualificationStatus: 'PENDING_APPROVAL', serviceStatus: 'ACTIVE', availability: true, bookingAllowed: false, reasons: ['Service qualification is awaiting approval.'], pricing: null, pendingPricingVersion: null },
    ],
  }
}
