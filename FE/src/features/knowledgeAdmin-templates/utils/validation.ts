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

/** Lỗi chặn tạo template, theo thứ tự hiện trên form; rỗng = hợp lệ */
export function templateIssues(input: NewTemplateInput): string[] {
  const issues: string[] = []
  if (!input.title.trim()) issues.push('Nhập tên template.')
  if (!input.category) issues.push('Chọn nhóm template.')
  if (input.fields.length === 0) issues.push('Thêm ít nhất một trường người dùng cần nhập.')
  input.fields.forEach((f, i) => {
    if (!f.label.trim()) issues.push(`Trường ${i + 1}: nhập tên trường.`)
    if (!f.group.trim()) issues.push(`Trường ${i + 1}: nhập nhóm trường.`)
  })
  // Hai trường cùng mã thì dữ liệu nhập đè lên nhau
  const seen = new Set<string>()
  for (const f of input.fields) {
    if (f.id && seen.has(f.id)) issues.push(`Tên trường "${f.label}" bị trùng.`)
    seen.add(f.id)
  }
  return issues
}
