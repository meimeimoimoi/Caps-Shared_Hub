import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))

// Loads the dashboard API with its imports replaced, so the cases come from the test
function loadDashboard(cases) {
  const filename = path.join(root, 'features/expert-dashboard/api/expertDashboardApi.ts')
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const mocks = {
    '@/lib/api-client': { ApiError: class extends Error {} },
    '@/lib/i18n': { i18n: { t: (key, options) => (options?.stars ? `${key}:${options.stars}` : key) } },
    '@/lib/expert-data-source': { isExpertDemo: false },
    '@/features/review-case/api/reviewCaseApi': { listReviewCases: async () => cases },
    '@/features/review-case/mapper': { caseTitle: (text) => text },
  }
  const module = { exports: {} }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
    (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier)),
    module,
    module.exports
  )
  return module.exports
}

const HOUR = 3_600_000
const t0 = Date.now() - 72 * HOUR
const at = (hours) => new Date(t0 + hours * HOUR).toISOString()
const context = { expertId: 'p1', services: [], version: 1 }
const base = {
  expertProfileId: 'p1',
  serviceCode: 'HUMAN_VERIFICATION',
  problemDescription: 'Case',
  rating: null,
  ratedAt: null,
  responseDeadline: null,
  acceptanceDeadline: null,
  infoRequests: null,
}
const onTimeRated = {
  ...base,
  id: 'a',
  status: 'COMPLETED',
  paidAt: at(0),
  acceptedAt: at(2),
  deliveryDeadline: at(48),
  deliveredAt: at(26),
  rating: 4,
  ratedAt: at(30),
  updatedAt: new Date().toISOString(),
}
const late = {
  ...base,
  id: 'b',
  status: 'AWAITING_ACCEPTANCE',
  paidAt: at(0),
  acceptedAt: at(4),
  deliveryDeadline: at(28),
  deliveredAt: at(52),
  updatedAt: at(52),
}
const otherExpert = { ...onTimeRated, id: 'c', expertProfileId: 'p2', rating: 1 }

test('performance is read from the expert own cases', async () => {
  const { getExpertDashboard } = loadDashboard([onTimeRated, late, otherExpert])
  const { performance } = await getExpertDashboard(undefined, 'normal', context)

  assert.equal(performance.status, 'available')
  assert.equal(performance.data.onTimeDeliveryRate, 50)
  assert.equal(performance.data.avgResponseHours, 3)
  assert.equal(performance.data.avgReviewDays, 1.5)
  assert.equal(performance.data.satisfactionScore, 4)
  assert.equal(performance.data.completedThisMonth, 1)
})

test('activity lists the latest steps first and names the stars', async () => {
  const { getExpertDashboard } = loadDashboard([onTimeRated, late, otherExpert])
  const { activity } = await getExpertDashboard(undefined, 'normal', context)
  const events = activity.data.events

  assert.ok(events.length <= 8)
  assert.ok(events.every((e) => e.caseId !== 'c'))
  assert.deepEqual(
    events.map((e) => e.timestamp),
    [...events.map((e) => e.timestamp)].sort().reverse()
  )
  assert.ok(events.some((e) => e.title === 'live.activity.rated:4'))
})

test('an expert with nothing delivered sees no performance yet', async () => {
  const waiting = { ...base, id: 'd', status: 'PENDING_EXPERT_RESPONSE', paidAt: at(0), acceptedAt: null, deliveredAt: null, deliveryDeadline: null, updatedAt: at(0) }
  const { getExpertDashboard } = loadDashboard([waiting])
  const { performance } = await getExpertDashboard(undefined, 'normal', context)

  assert.equal(performance.status, 'unavailable')
  assert.equal(performance.message, 'live.noDeliveriesYet')
})
