import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ManagedUser } from '../types'

// Keep demo mutations isolated from the live account directory.
const fixtures = () => import('./fixtures')
const BASE = '/api/v1/admin/users'
const PAGE_SIZE = 100

interface DirectoryUser {
  id: string
  fullName: string
  email: string
  phone?: string | null
  roles: string[]
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED'
  createdAt: string
  lastSignInAt: string | null
  suspendedReason: string | null
}

interface DirectoryPage {
  data: { items: DirectoryUser[]; total: number }
}

const roleCodes = {
  USER: 'CLIENT',
  EXPERT: 'EXPERT',
  AUTHOR_REVIEWER: 'REVIEWER',
  KNOWLEDGE_ADMIN: 'KNOWLEDGE_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const

function toManagedUser(user: DirectoryUser): ManagedUser {
  const roles = Object.entries(roleCodes)
    .filter(([code]) => user.roles.includes(code))
    .map(([, role]) => role)

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    role: roles.at(-1) ?? 'CLIENT',
    roles,
    status: user.status === 'SUSPENDED' ? 'LOCKED' : user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastSignInAt,
    lockReason: user.suspendedReason ?? undefined,
  }
}

export async function getUsers(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockUsers)
  const users = new Map<string, ManagedUser>()
  let total = 0
  let page = 1
  do {
    const { data } = await api.get<DirectoryPage>(BASE, {
      params: { page, pageSize: PAGE_SIZE },
      signal,
    })
    for (const user of data.items) users.set(user.id, toManagedUser(user))
    total = data.total
    if (data.items.length < PAGE_SIZE) break
    page++
  } while ((page - 1) * PAGE_SIZE < total)

  return [...users.values()]
}

/** Lock or unlock an account; both need a reason, kept in the audit trail. */
export async function setUserLocked(
  id: string,
  locked: boolean,
  reason: string,
  actor: string
) {
  if (isExpertDemo) {
    const user = (await fixtures()).mockUsers.find((x) => x.id === id)
    if (!user) return
    user.status = locked ? 'LOCKED' : 'ACTIVE'
    user.lockReason = locked ? reason : undefined
    user.history?.unshift({
      at: new Date().toISOString(),
      actor,
      text: locked
        ? `Khóa tài khoản: ${reason}`
        : `Mở khóa tài khoản: ${reason}`,
    })
    return
  }
  if (locked) {
    await api.post(`${BASE}/${id}/lock`, { reason })
  } else {
    await api.post(`${BASE}/${id}/unlock`, { reason })
  }
}

/** Request a password reset email for the account, with the reason kept in the audit trail. */
export async function sendPasswordReset(
  id: string,
  reason: string,
  actor: string
) {
  if (isExpertDemo) {
    const user = (await fixtures()).mockUsers.find((x) => x.id === id)
    user?.history?.unshift({
      at: new Date().toISOString(),
      actor,
      text: `Gửi email đặt lại mật khẩu: ${reason}`,
    })
    return
  }
  await api.post(`${BASE}/${id}/password-reset`, { reason })
}
