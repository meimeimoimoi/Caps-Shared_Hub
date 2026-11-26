import type { NewTemplateInput } from '../types'

/** Mã trường sinh từ tên: bỏ dấu, chữ thường, nối bằng "_" (vd. "Mã số thuế" → "ma_so_thue") */
export const toFieldId = (label: string) =>
  label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/** A problem that blocks saving: `target` is the control to fix, `field` the index of the field it is about */
export type TemplateIssue = {
  message: string
  target:
    | 'code'
    | 'taxYear'
    | 'title'
    | 'category'
    | 'fields'
    | 'label'
    | 'group'
    | 'anchor'
  field?: number
}

/** The problems that block saving, in the order they appear on the form; empty = valid */
export function templateIssues(input: NewTemplateInput): TemplateIssue[] {
  const issues: TemplateIssue[] = []
  if (!input.code.trim())
    issues.push({ message: 'Nhập mã template.', target: 'code' })
  if (
    !Number.isInteger(input.taxYear) ||
    input.taxYear < 2000 ||
    input.taxYear > 2100
  )
    issues.push({ message: 'Nhập năm tính thuế của mẫu.', target: 'taxYear' })
  if (!input.title.trim())
    issues.push({ message: 'Nhập tên template.', target: 'title' })
  if (!input.category)
    issues.push({ message: 'Chọn nhóm template.', target: 'category' })
  if (input.fields.length === 0)
    issues.push({
      message: 'Thêm ít nhất một trường người dùng cần nhập.',
      target: 'fields',
    })
  input.fields.forEach((f, i) => {
    if (!f.label.trim())
      issues.push({
        message: `Trường ${i + 1}: nhập tên trường.`,
        target: 'label',
        field: i,
      })
  })
  // One group name serves all its fields, so the ungrouped ones are named together
  const ungrouped = input.fields.flatMap((f, i) => (f.group.trim() ? [] : [i]))
  if (ungrouped.length)
    issues.push({
      message: `Đặt tên nhóm cho trường ${ungrouped.map((i) => i + 1).join(', ')}.`,
      target: 'group',
      field: ungrouped[0],
    })
  // Two fields with one id would overwrite each other's input
  const ids = new Set<string>()
  input.fields.forEach((f, i) => {
    if (f.id && ids.has(f.id))
      issues.push({
        message: `Tên trường "${f.label}" bị trùng.`,
        target: 'label',
        field: i,
      })
    ids.add(f.id)
  })
  // Two fields on one blank would write over each other in the file
  const places = new Map<string, number>()
  input.fields.forEach((f, i) => {
    if (!f.anchor) return
    const place = JSON.stringify(f.anchor)
    const first = places.get(place)
    if (first === undefined) places.set(place, i)
    else
      issues.push({
        message: `Trường ${i + 1} trùng vị trí trên file với trường ${first + 1}.`,
        target: 'anchor',
        field: i,
      })
  })
  return issues
}
