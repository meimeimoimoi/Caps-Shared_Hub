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

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
