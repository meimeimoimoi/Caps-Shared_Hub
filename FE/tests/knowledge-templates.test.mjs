import test from 'node:test'
import assert from 'node:assert/strict'
import { toSchemaFields } from '../src/features/drafting/utils/schemaFields.ts'
import {
  docxValues,
  fieldValue,
} from '../src/features/drafting/utils/docxValues.ts'
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

test('typed values go to their blanks: dates split, amounts grouped, empty ones skipped', () => {
  const at = { block: 2, find: '[01]' }
  const fields = [
    { id: 'year', label: '[01] Kỳ tính thuế', type: 'year', anchor: at },
    { id: 'signed', label: 'Ngày ký', type: 'date', anchor: { block: 6 } },
    { id: 'loss', label: 'Số lỗ', type: 'money', anchor: { block: 5, cell: [3, 2] } },
    { id: 'name', label: 'Họ và tên', type: 'text', anchor: { block: 7 } },
    { id: 'note', label: 'Ghi chú', type: 'text' },
  ]
  const input = { year: '2024', signed: '2026-03-31', loss: '5000000', name: ' ', note: 'x' }
  const money = (n) => n.toLocaleString('vi-VN')
  assert.deepEqual(
    docxValues(fields, input, money).map((f) => [f.label, f.text]),
    [
      ['[01] Kỳ tính thuế', '2024'],
      ['Ngày ký', ['31', '03', '2026']],
      ['Số lỗ', '5.000.000'],
    ]
  )
})

test('typing on the file: every anchored field gets blanks, even empty ones', () => {
  const fields = [
    { id: 'signed', label: 'Ngày ký', type: 'date', anchor: { block: 6 } },
    { id: 'name', label: 'Họ và tên', type: 'text', anchor: { block: 7 } },
    { id: 'note', label: 'Ghi chú', type: 'text' },
  ]
  assert.deepEqual(
    docxValues(fields, {}, String, true).map((f) => [f.id, f.text]),
    [
      ['signed', ['', '', '']],
      ['name', ''],
    ]
  )
})

test('what is typed on the file becomes the form value; a partial date waits', () => {
  const date = { type: 'date' }
  assert.equal(fieldValue(date, ['5', '3', '2026'], 'vi'), '2026-03-05')
  assert.equal(fieldValue(date, ['05/03/2026'], 'vi'), '2026-03-05')
  assert.equal(fieldValue(date, ['', '', ''], 'vi'), '')
  assert.equal(fieldValue(date, ['5', '', '2026'], 'vi'), null)
  assert.equal(fieldValue(date, ['5', '3', '26'], 'vi'), null)
  assert.equal(fieldValue({ type: 'money' }, ['5.000.000'], 'vi'), '5000000')
  assert.equal(fieldValue({ type: 'text' }, ['Nguyễn An'], 'vi'), 'Nguyễn An')
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

test('save is blocked with a pointer to each control to fix', async () => {
  const { templateIssues } = await import(
    '../src/features/knowledgeAdmin-templates/utils/validation.ts'
  )
  const at = { block: 2, find: 'Họ và tên' }
  const field = (over) => ({ id: 'x', label: 'X', group: 'A', type: 'text', required: true, ...over })
  const issues = templateIssues({
    code: '',
    title: 'Tờ khai',
    category: 'TAX',
    description: '',
    changelog: '',
    fileName: '',
    taxYear: 2026,
    fields: [
      field({ id: 'ho_ten', label: 'Họ tên', anchor: at }),
      field({ id: '', label: '', group: '' }),
      field({ id: 'nguoi_nop', label: 'Người nộp', group: '', anchor: { ...at } }),
    ],
  })
  assert.deepEqual(
    issues.map((x) => [x.target, x.field]),
    [
      ['code', undefined],
      ['label', 1],
      ['group', 1],
      ['anchor', 2],
    ]
  )
  assert.equal(issues[2].message, 'Đặt tên nhóm cho trường 2, 3.')
  assert.equal(issues[3].message, 'Trường 3 trùng vị trí trên file với trường 1.')
})
