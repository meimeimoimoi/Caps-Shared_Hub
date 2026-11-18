import test from 'node:test'
import assert from 'node:assert/strict'
import { toSchemaFields } from '../src/features/drafting/utils/schemaFields.ts'
import {
  fromAdminSummary,
  fromAdminTemplate,
} from '../src/features/knowledgeAdmin-templates/api/mappers.ts'

test('stored fields become form fields; odd entries are made safe', () => {
  const fields = toSchemaFields([
    {
      id: 'tax_year',
      label: 'Năm tính thuế',
      group: 'Chung',
      type: 'year',
      required: true,
    },
    { label: 'Ghi chú', type: 'rich-text', required: false },
    'not a field',
  ])
  assert.equal(fields.length, 2)
  assert.deepEqual(fields[0], {
    id: 'tax_year',
    label: 'Năm tính thuế',
    group: 'Chung',
    type: 'year',
    required: true,
  })
  assert.equal(fields[1].id, 'field_2')
  assert.equal(fields[1].type, 'text')
  assert.equal(fields[1].required, false)
  assert.deepEqual(toSchemaFields(null), [])
})

test('a stored anchor comes back with its field; a malformed one is dropped', () => {
  const anchor = { block: 5, cell: [3, 1], find: '[04]' }
  const [kept, bad, negative] = toSchemaFields([
    { id: 'a', label: 'A', type: 'money', anchor },
    { id: 'b', label: 'B', type: 'text', anchor: { block: '2' } },
    { id: 'c', label: 'C', type: 'text', anchor: { block: 1, cell: [-1, 0] } },
  ])
  assert.deepEqual(kept.anchor, anchor)
  assert.equal('anchor' in bad, false)
  assert.equal('anchor' in negative, false)
})

const summary = (over) => ({
  id: 't-1',
  code: '03/TNDN',
  name: 'Tờ khai quyết toán',
  description: null,
  isActive: true,
  latestVersionNo: 1,
  latestStatus: 'DRAFT',
  publishedVersionNo: null,
  updatedAt: '2026-11-06T03:00:00Z',
  ...over,
})

test('a template users cannot see yet is inactive until its draft is published', () => {
  const t = fromAdminSummary(summary())
  assert.equal(t.status, 'INACTIVE')
  assert.equal(t.draftPending, undefined)
  assert.equal(t.versions[0].changelog, 'Bản nháp, chưa phát hành')
})

test('a published template with a newer draft stays active and flags the draft', () => {
  const t = fromAdminSummary(
    summary({ latestVersionNo: 2, publishedVersionNo: 1 })
  )
  assert.equal(t.status, 'ACTIVE')
  assert.equal(t.draftPending, true)
  assert.equal(t.versions[0].version, 2)
})

test('the detail lists versions newest first with their fields', () => {
  const t = fromAdminTemplate({
    id: 't-1',
    code: '03/TNDN',
    name: 'Tờ khai quyết toán',
    description: 'Mẫu 03',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
    versions: [
      {
        id: 'v1',
        versionNo: 1,
        status: 'DEPRECATED',
        createdBy: 'u',
        createdAt: '2026-11-01T00:00:00Z',
        fieldSchema: [{ id: 'a', label: 'A', type: 'text' }],
      },
      {
        id: 'v2',
        versionNo: 2,
        status: 'PUBLISHED',
        createdBy: 'u',
        createdAt: '2026-11-02T00:00:00Z',
        fieldSchema: [{ id: 'b', label: 'B', type: 'money' }],
      },
    ],
  })
  assert.deepEqual(
    t.versions.map((v) => v.version),
    [2, 1]
  )
  assert.equal(t.status, 'ACTIVE')
  assert.equal(t.draftPending, undefined)
  assert.equal(t.versions[0].fields[0].type, 'money')
  assert.equal(t.versions[1].changelog, 'Đã thay bằng phiên bản mới')
})
