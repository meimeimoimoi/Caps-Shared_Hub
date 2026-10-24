import { safeReturnPath } from './returnPath'

/**
 * What the person said they want when signing up. It only picks the page after verification:
 * it is never stored or sent to the server and grants no role (expert access opens after approval).
 */
export type SignupRole = 'client' | 'expert'

export const EXPERT_APPLICATION_PATH = '/expert/application'

/** Where a new account goes once it may enter the app; customers keep the page they were heading to. */
export function signupDestination(role: SignupRole, from?: unknown): string {
  return role === 'expert' ? EXPERT_APPLICATION_PATH : safeReturnPath(from)
}

export function isSignupRole(value: unknown): value is SignupRole {
  return value === 'client' || value === 'expert'
}
