import type { User } from '../types'

/** Permission names issued by the auth service (BE PermissionMatrix, put in the token and /users/me).
 * Mirror only names that exist there; the BE stays the source of truth and checks every API call. */
export const Permission = {
  ExpertReview: 'ExpertReview',
  KnowledgeManage: 'KnowledgeManage',
  UserManage: 'UserManage',
  ExpertApprove: 'ExpertApprove',
} as const

export type PermissionName = (typeof Permission)[keyof typeof Permission]

/** True when the user holds at least one of the permissions. */
export function hasAnyPermission(
  user: User | null | undefined,
  required: readonly PermissionName[]
) {
  const granted = user?.permissions ?? []
  return required.some((p) => granted.includes(p))
}
