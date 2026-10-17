import type { SchemaField } from '@/features/drafting/types'
import type { TEMPLATE_STATUS } from '../constants'

/** Một phiên bản đã phát hành; không sửa được, muốn đổi phải tạo phiên bản mới (BR-D22) */
export interface ManagedTemplateVersion {
  /** Trùng id TemplateVersion phía soạn nháp, khớp khu soạn nháp */
  id: string
  version: number
  publishedAt: string
  publishedBy: string
  changelog: string
  /** File mẫu văn bản (.docx) đã tải lên cho phiên bản này */
  fileName: string
  fields: SchemaField[]
  /** Số bản nháp đang ghim phiên bản này */
  workspaces: number
}

export interface ManagedTemplate {
  id: string
  title: string
  /** Mô tả người dùng thấy khi chọn mẫu */
  description: string
  category: string
  /** INACTIVE = người dùng không tạo được bản nháp mới (BR-D01) */
  status: keyof typeof TEMPLATE_STATUS
  /** Mới nhất trước; phần tử đầu là phiên bản đang phát hành */
  versions: ManagedTemplateVersion[]
  history: { at: string; actor: string; text: string }[]
}

/** Dữ liệu form tải lên template; phát hành thành v1 */
export interface NewTemplateInput {
  /** Tên file mẫu; file gửi riêng qua multipart */
  fileName: string
  title: string
  description: string
  category: string
  changelog: string
  fields: SchemaField[]
}
