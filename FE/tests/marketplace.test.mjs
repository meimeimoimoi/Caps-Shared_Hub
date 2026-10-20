import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bioFromDto,
  businessDate,
  featuredExperts,
  hasDeliverySla,
  initialsOf,
  listingsFor,
  marketplaceFromDtos,
  serviceFacts,
} from '../src/features/marketplace/model.ts'

const dto = (overrides = {}) => ({
  expertId: '019a0000-0000-7000-8000-000000000001',
  displayName: 'Nguyễn Văn An',
  title: 'Kế toán trưởng',
  company: 'Công ty ABC',
  location: 'Hà Nội',
  yearsExperience: 8,
  fields: ['Thuế TNDN'],
  bio: 'Bio',
  highlights: '- First\n\nSecond  ',
  ratingAvg: 0,
  ratingCount: 0,
  services: [
    {
      serviceCode: 'HUMAN_VERIFICATION',
      serviceName: 'Xác minh bởi chuyên gia',
      price: 1500000,
      pricingVersion: 'v2',
      slaHours: 72,
      approvedAt: '2026-10-17T03:00:00Z',
    },
  ],
  nextOpenSlotAt: '2026-10-20T02:00:00Z',
  openSlotCount: 3,
  ...overrides,
})

test('maps API experts to the shared marketplace model', () => {
  const data = marketplaceFromDtos([dto()])
  assert.deepEqual(data.services, [
    { id: 'HUMAN_VERIFICATION', name: 'Xác minh bởi chuyên gia' },
  ])
  const [expert] = data.experts
  assert.equal(expert.headline, 'Kế toán trưởng · Công ty ABC')
  assert.equal(expert.initials, 'NA')
  assert.deepEqual(expert.highlights, ['First', 'Second'])
  assert.deepEqual(expert.availability, {
    state: 'open',
    nextSlotAt: '2026-10-20T02:00:00Z',
    slotCount: 3,
  })
  assert.equal(expert.offers.HUMAN_VERIFICATION.slaHours, 72)
  assert.equal(expert.offers.HUMAN_VERIFICATION.approvedAt, '2026-10-17')
  assert.equal(hasDeliverySla(data.experts), true)
})

test('service facts report the lowest fee and fastest SLA', () => {
  const data = marketplaceFromDtos([
    dto(),
    dto({
      expertId: 'b',
      services: [{ ...dto().services[0], price: 900000, slaHours: 48 }],
    }),
  ])
  assert.deepEqual(serviceFacts(data), [
    {
      id: 'HUMAN_VERIFICATION',
      name: 'Xác minh bởi chuyên gia',
      count: 2,
      from: 900000,
      fastest: 48,
    },
  ])
  assert.equal(listingsFor(data.experts, 'OTHER').length, 0)
})

test('falls back to the id when the expert has no display name', () => {
  const data = marketplaceFromDtos([dto({ displayName: null, title: null })])
  assert.equal(data.experts[0].name, dto().expertId)
  assert.equal(data.experts[0].headline, 'Công ty ABC')
})

test('public profile keeps the price as text and has no SLA', () => {
  const bio = bioFromDto(dto())
  assert.equal(bio.services[0].price, '1500000')
  assert.equal(bio.services[0].slaHours, 72)
  assert.equal(bio.listing.catalog, undefined)
  assert.equal(bio.yearsOfExperience, 8)
})

test('approval dates use the Vietnam business date', () => {
  assert.equal(businessDate('2026-10-17T18:30:00Z'), '2026-10-18')
  assert.equal(businessDate('2026-10-18T02:38:27.853545+00:00'), '2026-10-18')
  assert.equal(businessDate(null), null)
})

test('featured experts are best rated and exclude the current one', () => {
  const { experts } = marketplaceFromDtos([
    dto({ expertId: 'a', ratingAvg: 4.2, ratingCount: 3 }),
    dto({ expertId: 'b', ratingAvg: 4.9, ratingCount: 1 }),
  ])
  assert.deepEqual(
    featuredExperts(experts, 3, 'a').map((e) => e.id),
    ['b']
  )
  assert.equal(initialsOf('LS. Vũ Trọng Nghĩa'), 'VN')
})
