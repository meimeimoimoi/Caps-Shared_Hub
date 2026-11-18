import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fieldsFromDocx,
  fillRanges,
} from '../src/features/knowledgeAdmin-templates/utils/docxFields.ts'
import {
  parseQuickFields,
  toQuickText,
} from '../src/features/knowledgeAdmin-templates/utils/quickFields.ts'

// The shape docx-preview gives form 03-2/TNDN, cut down to one section and one input row
const form = [
  'Mẫu số: 03-2/TNDN (Ban hành kèm theo Thông tư số 80/2021/TT-BTC ngày 29 tháng 9 năm 2021)',
  'CHUYỂN LỖ',
  '[01] Kỳ tính thuế:.......',
  '[02] Tên người nộp thuế: ...........',
  'Người đại diện: {{ Người đại diện }}',
  [
    [['STT'], ['Năm phát sinh lỗ'], ['Số lỗ phát sinh'], ['Ghi chú dòng']],
    [['(1)'], ['(2)'], ['(3)'], ['(4)']],
    [['I'], ['Lỗ sản xuất kinh doanh']],
    [[''], ['Năm…'], [''], ['']],
    [[''], ['…'], [''], ['']],
    [[''], ['Tổng cộng'], ['[04]'], ['']],
  ],
  [
    [
      ['NHÂN VIÊN ĐẠI LÝ THUẾ', 'Họ và tên:..........'],
      ['..., ngày....... tháng....... năm.......', 'NGƯỜI NỘP THUẾ hoặc'],
    ],
  ],
  '- Số liệu chỉ tiêu [04] được tổng hợp vào chỉ tiêu C3a của Tờ khai 03/TNDN;',
]

test('blanks of a tax form become fields with groups and guessed types', () => {
  assert.deepEqual(
    fieldsFromDocx(form).map((f) => [f.group, f.label, f.type]),
    [
      ['Thông tin chung', '[01] Kỳ tính thuế', 'year'],
      ['Thông tin chung', '[02] Tên người nộp thuế', 'text'],
      ['Thông tin chung', 'Người đại diện', 'text'],
      ['I. Lỗ sản xuất kinh doanh', 'Năm phát sinh lỗ (I, năm 1)', 'year'],
      ['I. Lỗ sản xuất kinh doanh', 'Số lỗ phát sinh (I, năm 1)', 'money'],
      ['I. Lỗ sản xuất kinh doanh', 'Ghi chú dòng (I, năm 1)', 'text'],
      ['I. Lỗ sản xuất kinh doanh', '[04] Tổng cộng', 'money'],
      ['Nhân viên đại lý thuế', 'Họ và tên', 'text'],
      ['Thông tin chung', 'Ngày ký', 'date'],
    ]
  )
})

test('found fields survive the round trip through the quick-entry text', () => {
  const fields = fieldsFromDocx(form).map(({ anchor: _anchor, ...f }) => f)
  assert.deepEqual(parseQuickFields(toQuickText(fields)), fields)
})

test('each field remembers where it sits in the file', () => {
  const at = Object.fromEntries(fieldsFromDocx(form).map((f) => [f.label, f.anchor]))
  assert.deepEqual(at['[01] Kỳ tính thuế'], { block: 2, find: '[01]' })
  assert.deepEqual(at['Người đại diện'], { block: 4, find: '{{ Người đại diện }}' })
  assert.deepEqual(at['Năm phát sinh lỗ (I, năm 1)'], { block: 5, cell: [3, 1] })
  assert.deepEqual(at['[04] Tổng cộng'], { block: 5, cell: [5, 2], find: '[04]' })
  assert.deepEqual(at['Họ và tên'], { block: 6, cell: [0, 0], p: 1, find: 'Họ và tên' })
  assert.deepEqual(at['Ngày ký'], { block: 6, cell: [0, 1], p: 0, find: 'ngày' })
})

test('a value replaces the dots after its label, a placeholder, or goes at the end', () => {
  assert.deepEqual(fillRanges('[01] Kỳ tính thuế:.......', '[01]'), [[18, 25]])
  // The dots before "ngày" are the place name, not part of the date
  assert.deepEqual(
    fillRanges('..., ngày....... tháng....... năm.......', 'ngày', 3),
    [[9, 16], [22, 29], [33, 40]]
  )
  assert.deepEqual(fillRanges('Năm…'), [[3, 4]])
  assert.deepEqual(fillRanges('A {{ x }} b', '{{ x }}'), [[2, 9]])
  assert.deepEqual(fillRanges('[04]', '[04]'), [[4, 4]])
  assert.deepEqual(fillRanges(''), [[0, 0]])
  assert.deepEqual(fillRanges('abc', 'zzz'), [[3, 3]])
})
