import type { USER_ROLES, USER_STATUS } from '../constants'

export type UserRole = (typeof USER_ROLES)[number]

/** Một tài khoản trên nền tảng, nhìn từ phía System Admin */
export interface ManagedUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: keyof typeof USER_STATUS
  createdAt: string
  /** null = chưa đăng nhập lần nào */
  lastLoginAt: string | null
  /** Chỉ có khi đang bị khóa */
  lockReason?: string
  history: { at: string; actor: string; text: string }[]
}
