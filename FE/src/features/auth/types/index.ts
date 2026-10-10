export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface LoginFormValues {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
