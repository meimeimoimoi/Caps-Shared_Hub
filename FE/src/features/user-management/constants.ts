/* Vai trò và trạng thái tài khoản; nhãn là key i18n trong admin.json (users.*) */
export const USER_ROLES = [
  'CLIENT',
  'EXPERT',
  'REVIEWER',
  'KNOWLEDGE_ADMIN',
  'SYSTEM_ADMIN',
] as const

export const USER_STATUS = {
  ACTIVE: { label: 'users.status.ACTIVE', tone: 'success' },
  PENDING_VERIFICATION: { label: 'users.status.PENDING_VERIFICATION', tone: 'warning' },
  LOCKED: { label: 'users.status.LOCKED', tone: 'danger' },
} as const

export const ALL = 'ALL'
