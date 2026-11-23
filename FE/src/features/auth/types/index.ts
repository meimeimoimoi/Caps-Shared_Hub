/** Trạng thái tài khoản do auth service trả về */
export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | (string & {})

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  phone?: string | null
  status?: AccountStatus
  emailVerified?: boolean
  roles?: string[]
  permissions?: string[]
}

export interface LoginFormValues {
  email: string
  password: string
  rememberMe?: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
