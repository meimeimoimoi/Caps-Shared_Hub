import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { paginate } from '../src/lib/pagination.ts'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))
const cache = new Map()

// Resolve the same local aliases as Vite while exercising the actual filtering utilities.
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const localRequire = (specifier) => {
    if (specifier === '@/lib/api-client') return { api: {} }
    if (!specifier.startsWith('.') && !specifier.startsWith('@/'))
      return require(specifier)
    const target = specifier.startsWith('@/')
      ? path.join(root, specifier.slice(2))
      : path.resolve(path.dirname(filename), specifier)
    return load(
      [target + '.ts', target + '.tsx', path.join(target, 'index.ts')].find(
        fs.existsSync
      )
    )
  }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
    filename,
  })(localRequire, module, module.exports)
  return module.exports
}

const { filterDisputes, disputeHoursLeft } = load(
  path.join(root, 'features/disputes-escrow/utils/disputes.ts')
)
const rows = [
  {
    id: 'case-1',
    code: 'FIRST',
    client: 'khach@example.com',
    expert: 'Nguyễn Văn An',
    ground: 'Thiếu tài liệu',
    kind: 'DELIVERY_ISSUE',
    hoursLeft: 0,
  },
  {
    id: 'case-2',
    code: 'SECOND',
    expert: 'Trần Bình',
    ground: 'Chất lượng',
    kind: 'DELIVERY_ISSUE',
    escalatedAt: '2026-11-17',
    hoursLeft: 12,
  },
  {
    id: 'case-3',
    title: 'Hồ sơ công ty',
    kind: 'USER_NON_RESPONSE_CHALLENGE',
    ground: 'Chấm dứt',
    hoursLeft: 13,
  },
  {
    id: 'case-4',
    kind: 'DELIVERY_ISSUE',
    ground: 'Đã xử lý',
    resolvedAt: '2026-11-18',
    hoursLeft: null,
  },
]
const kindLabel = (kind) =>
  kind === 'DELIVERY_ISSUE' ? 'Kết quả bàn giao' : 'Quyết định chấm dứt'
const filter = (query = '', status = 'all', sla = 'all') =>
  filterDisputes(rows, query, status, sla, kindLabel).map((row) => row.id)

test('search matches IDs, codes, email, unaccented names, grounds and translated kind', () => {
  for (const query of [
    'CASE-1',
    'first',
    'khach@example.com',
    'nguyen van an',
    'thieu tai lieu',
  ]) {
    assert.deepEqual(filter(query), ['case-1'])
  }
  assert.deepEqual(filter('quyet dinh cham dut'), ['case-3'])
  assert.deepEqual(
    filter('   '),
    rows.map((row) => row.id)
  )
})

test('status and SLA filters combine and exclude resolved cases from deadline filters', () => {
  assert.deepEqual(filter('', 'open'), ['case-1', 'case-3'])
  assert.deepEqual(filter('', 'escalated', 'dueSoon'), ['case-2'])
  assert.deepEqual(filter('', 'resolved'), ['case-4'])
  assert.deepEqual(filter('', 'all', 'overdue'), ['case-1'])
  assert.deepEqual(filter('', 'all', 'onTime'), ['case-3'])
  assert.deepEqual(filter('', 'resolved', 'overdue'), [])
})

test('filtering the entire queue before pagination finds cases beyond the first page', () => {
  const all = Array.from({ length: 25 }, (_, index) => ({
    ...rows[0],
    id: `case-${index}`,
    code: `CODE-${index}`,
  }))
  const filtered = filterDisputes(all, 'CODE-24', 'all', 'all', kindLabel)
  const paged = paginate(filtered, 0, 10)
  assert.equal(paged.total, 1)
  assert.equal(paged.rows[0].code, 'CODE-24')
})

test('server deadlines cross into overdue without applying a new SLA window', () => {
  const decideBy = '2026-11-18T12:00:00Z'
  const dispute = { openedAt: '2026-11-16T12:00:00Z', decideBy }
  assert.equal(disputeHoursLeft(dispute, Date.parse('2026-11-18T11:59:00Z')), 1)
  assert.equal(disputeHoursLeft(dispute, Date.parse(decideBy)), 0)
  assert.equal(disputeHoursLeft(dispute, Date.parse('2026-11-18T12:01:00Z')), 0)
})

test('review queues retain server totals and page boundaries', () => {
  const { toPaged } = load(
    path.join(root, 'features/expert-vetting/api/reviewQueueApi.ts')
  )
  const page = toPaged(
    Array.from({ length: 5 }, (_, id) => ({ id })),
    3,
    10,
    25
  )
  assert.equal(page.from, 21)
  assert.equal(page.to, 25)
  assert.equal(page.total, 25)
  assert.equal(page.canPrev, true)
  assert.equal(page.canNext, false)
  assert.equal(page.pageCount, 3)
})
