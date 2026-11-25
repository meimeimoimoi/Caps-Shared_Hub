import test from 'node:test'
import assert from 'node:assert/strict'
import { parseQuickFields } from '../src/features/knowledgeAdmin-templates/utils/quickFields.ts'

test('each line becomes a field with its group, type and required mark', () => {
  const fields = parseQuickFields(
    [
      'Thông tin chung | Tên doanh nghiệp | text | *',
      '',
      'Kỳ tính thuế | Năm tính thuế | Năm | *',
      'Kỳ tính thuế | Doanh thu | money',
    ].join('\n')
  )
  assert.deepEqual(fields, [
    { label: 'Tên doanh nghiệp', group: 'Thông tin chung', type: 'text', required: true },
    { label: 'Năm tính thuế', group: 'Kỳ tính thuế', type: 'year', required: true },
    { label: 'Doanh thu', group: 'Kỳ tính thuế', type: 'money', required: false },
  ])
})

test('a label-only line keeps the last group; tabs split columns; unknown types are text', () => {
  const fields = parseQuickFields('Chung\tMã số thuế\tabc\t*\r\nĐịa chỉ', 'Cũ')
  assert.deepEqual(
    fields.map((f) => [f.group, f.label, f.type, f.required]),
    [
      ['Chung', 'Mã số thuế', 'text', true],
      ['Chung', 'Địa chỉ', 'text', false],
    ]
  )
  assert.equal(parseQuickFields('Ghi chú', 'Cũ')[0].group, 'Cũ')
  assert.deepEqual(parseQuickFields('Nhóm |  | text'), [])
})
