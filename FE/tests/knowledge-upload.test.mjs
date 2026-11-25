import test from 'node:test'
import assert from 'node:assert/strict'
import {
  rejectedResult,
  uploadedResult,
} from '../src/features/knowledgeAdmin-review-approval/api/uploadMappers.ts'

const doc = (versionNo) => ({
  id: 'doc-1',
  documentNumber: '80/2021/TT-BTC',
  versionNo,
  createdAt: '2026-11-06T02:00:00Z',
})

test('a new legal source waits in the queue with a link to its document', () => {
  const r = uploadedResult('tt80.pdf', doc(1))
  assert.equal(r.result, 'QUEUED')
  assert.equal(r.documentId, 'doc-1')
  assert.equal(r.number, '80/2021/TT-BTC')
})

test('a number already stored adds a new version', () => {
  assert.equal(uploadedResult('tt80.pdf', doc(2)).result, 'NEW_VERSION')
})

test('duplicates and bad files become rows; other errors stay errors', () => {
  const at = '2026-11-06T02:00:00Z'
  assert.equal(
    rejectedResult('a.pdf', 'X', 'DOCUMENT_DUPLICATE', at)?.result,
    'DUPLICATE'
  )
  assert.equal(
    rejectedResult('a.pdf', 'X', 'FILE_INVALID_TYPE', at)?.result,
    'FILE_INVALID'
  )
  assert.equal(rejectedResult('a.pdf', 'X', 'VALIDATION_FAILED', at), null)
  assert.equal(rejectedResult('a.pdf', 'X', undefined, at), null)
})
