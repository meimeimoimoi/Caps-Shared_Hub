import { lazy } from 'react'

// Session consumers can use this public API without eagerly loading the login UI.
export const LoginPage = lazy(() => import('./pages/LoginPage'))
export { useAuth } from './hooks/useAuth'
export { useAuthStore } from './model/authStore'
export { validateAccount, passwordRequirements } from './model/accountValidation'
export type { AccountField } from './model/accountValidation'
export type * from './model/types'
