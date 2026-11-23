import type { SchemaField } from '@/features/drafting/types'

export const TEMPLATE_STATUS = {
  ACTIVE: { label: 'Đang dùng', tone: 'success' },
  INACTIVE: { label: 'Tạm ngưng', tone: 'neutral' },
} as const

/* Nhãn tiếng Việt cho mã nhóm template phía soạn nháp */
export const TEMPLATE_CATEGORY: Record<string, string> = {
  Explanation: 'Giải trình',
  Finalization: 'Quyết toán',
  Refund: 'Hoàn thuế',
  Incentive: 'Ưu đãi',
}

export const FIELD_TYPE: Record<SchemaField['type'], string> = {
  text: 'Chữ',
  textarea: 'Đoạn văn',
  money: 'Số tiền',
  date: 'Ngày',
  year: 'Năm',
}
