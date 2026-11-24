import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { sortRows } from '../src/lib/table-sort.ts'
import { paginate } from '../src/lib/pagination.ts'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))

function load(relative, mocks) {
  const filename = path.join(root, relative)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
    filename,
  })(
    (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier)),
    module,
    module.exports
  )
  return module.exports
}

test('sortable headers expose direction and send the selected column on activation', () => {
  const filename = 'components/ui/navigation/sortable-th.tsx'
  const source = ts.transpileModule(fs.readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(
    (specifier) => specifier === 'react-i18next' ? {
      useTranslation: () => ({ t: (key, args) => `${key}: ${args.column}` }),
    } : require(specifier), module, module.exports
  )
  const { SortableTh } = module.exports
  const selected = []
  const header = SortableTh({ column: 'amount', sort: { key: 'amount', direction: 'asc' }, onSort: (key) => selected.push(key), children: 'Amount' })
  assert.equal(header.props['aria-sort'], 'ascending')
  assert.equal(header.props.children.type, 'button')
  assert.match(header.props.children.props['aria-label'], /sortDescending/)
  header.props.children.props.onClick()
  assert.deepEqual(selected, ['amount'])
  const staticHeader = SortableTh({ column: 'amount', children: 'Amount' })
  assert.equal(staticHeader.props.children, 'Amount')
  assert.equal(staticHeader.props['aria-sort'], undefined)
})

test('amounts sort numerically and stable ties preserve source order without mutating data', () => {
  const rows = [
    { id: 'a', amount: 100 },
    { id: 'b', amount: 20 },
    { id: 'c', amount: 20 },
  ]
  assert.deepEqual(
    sortRows(rows, (r) => r.amount, 'asc').map((r) => r.id),
    ['b', 'c', 'a']
  )
  assert.deepEqual(
    sortRows(rows, (r) => r.amount, 'desc').map((r) => r.id),
    ['a', 'b', 'c']
  )
  assert.deepEqual(
    rows.map((r) => r.id),
    ['a', 'b', 'c']
  )
})

test('missing values and invalid dates stay last in both directions', () => {
  const rows = [null, 30, undefined, NaN, 10, Infinity]
  assert.deepEqual(sortRows(rows, (r) => r, 'asc').slice(0, 2), [10, 30])
  assert.deepEqual(sortRows(rows, (r) => r, 'desc').slice(0, 2), [30, 10])
  const dates = ['invalid', '2026-11-19T03:00:00Z', '2026-11-19T02:00:00Z']
  assert.equal(sortRows(dates, Date.parse, 'asc').at(-1), 'invalid')
})

test('text follows the selected locale and numeric identifiers keep natural order', () => {
  const labels = ['case-10', 'case-2', 'case-1']
  assert.deepEqual(
    sortRows(labels, (r) => r, 'asc', 'en'),
    ['case-1', 'case-2', 'case-10']
  )
  const names = ['Đặng', 'Dương', 'An', 'Bình']
  const collator = new Intl.Collator('vi', {
    numeric: true,
    sensitivity: 'base',
  })
  assert.deepEqual(
    sortRows(names, (r) => r, 'asc', 'vi'),
    [...names].sort(collator.compare)
  )
})

test('sorting before pagination moves the largest amount from the final page to the first', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ amount: i + 1 }))
  const page = paginate(
    sortRows(rows, (r) => r.amount, 'desc'),
    0,
    10
  )
  assert.equal(page.rows[0].amount, 25)
  assert.equal(page.rows.at(-1).amount, 16)
  assert.equal(page.total, 25)
})

test('review, approval and assignment API requests carry server sorting and cancellation', async () => {
  const calls = []
  const api = {
    get: async (url, options) => {
      calls.push({ url, ...options })
      return { data: { items: [], total: 0 } }
    },
  }
  const mocks = { '@/lib/api-client': { api } }
  const { searchReviewQueue } = load(
    'features/expert-vetting/api/reviewQueueApi.ts',
    mocks
  )
  const { searchAssignments } = load(
    'features/expert-vetting/api/assignmentApi.ts',
    mocks
  )
  const signal = new AbortController().signal
  const params = {
    applicationStatuses: [],
    qualificationStatuses: ['PENDING_FINAL_APPROVAL'],
    search: '',
    page: 2,
    pageSize: 10,
    claim: 'ALL',
    sortBy: 'years',
    sortDescending: true,
  }
  await searchReviewQueue('review', params, signal)
  await searchReviewQueue('approval', params, signal)
  await searchAssignments(params, signal)
  for (const call of calls) {
    assert.equal(call.params.sortBy, 'years')
    assert.equal(call.params.sortDescending, true)
    assert.equal(call.params.page, 2)
    assert.equal(call.signal, signal)
  }
})

test('escrow retrieval includes every server page before sorting', async () => {
  const pages = []
  const { getEscrows } = load('features/disputes-escrow/api/disputesApi.ts', {
    '@/lib/api-client': {
      ApiError: Error,
      api: {
        get: async (url, { params }) => {
          // Each escrow page also asks workflow who the parties are; none here
          if (url.endsWith('/parties')) return { data: [] }
          pages.push(params.page)
          const start = (params.page - 1) * 100
          const items = Array.from(
            { length: Math.min(100, 245 - start) },
            (_, i) => ({ id: `escrow-${start + i}`, amount: start + i + 1 })
          )
          return { data: { items, total: 245 } }
        },
      },
    },
    '@/lib/expert-data-source': { isExpertDemo: false },
    '@/features/expert-vetting/constants': {},
    '@/lib/i18n': {},
    '../constants': {},
    '@/features/marketplace/api/marketplaceApi': {},
    './escrowMappers': { toEscrow: (row) => row },
  })
  const rows = await getEscrows()
  assert.deepEqual(pages, [1, 2, 3])
  assert.equal(rows.length, 245)
  assert.equal(sortRows(rows, (r) => r.amount, 'desc')[0].amount, 245)
})
