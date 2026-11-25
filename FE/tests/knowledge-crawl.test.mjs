import test from 'node:test'
import assert from 'node:assert/strict'
import {
  runResult,
  toCollectionRun,
} from '../src/features/knowledgeAdmin-sources/api/mappers.ts'

const job = (over) => ({
  id: 'job-1',
  triggerType: 'MANUAL',
  triggeredBy: 'user-1',
  status: 'SUCCEEDED',
  docsFound: 3,
  detail: null,
  startedAt: '2026-11-06T01:00:00Z',
  finishedAt: '2026-11-06T01:10:00Z',
  ...over,
})

test('a finished crawl counts imported, already stored and unparsed documents', () => {
  const run = toCollectionRun(
    job({
      detail: {
        result: {
          documents: [
            { documentNumber: 'A', parseStatus: 'PARSED', imported: true },
            {
              documentNumber: 'B',
              parseStatus: 'PARSE_FAILED',
              imported: true,
            },
            { documentNumber: 'C', parseStatus: 'PARSED', imported: false },
          ],
        },
      },
    })
  )
  assert.equal(run.newDocs, 2)
  assert.equal(run.unchanged, 1)
  assert.equal(run.errors, 1)
  assert.equal(run.trigger, 'MANUAL')
  assert.equal(runResult(run), '2 văn bản mới · 1 không đổi')
})

test('a running crawl shows the latest milestone', () => {
  const run = toCollectionRun(
    job({
      status: 'RUNNING',
      detail: { progress: { stage: 'POSTING', done: 2, total: 5 } },
    })
  )
  assert.equal(run.note, 'Đang đưa vào hàng đợi 2/5')
  assert.equal(runResult(run), 'Đang chạy · Đang đưa vào hàng đợi 2/5')
})

test('a failed crawl keeps the worker error', () => {
  const run = toCollectionRun(
    job({ status: 'FAILED', detail: { result: { error: 'Timeout' } } })
  )
  assert.equal(run.note, 'Timeout')
  assert.equal(runResult(run), 'Thất bại')
})

test('demo runs keep their version count', () => {
  const text = runResult({
    at: '',
    trigger: 'SCHEDULED',
    newDocs: 1,
    newVersions: 2,
    unchanged: 3,
    errors: 0,
  })
  assert.equal(text, '1 văn bản mới · 2 phiên bản mới · 3 không đổi')
})
