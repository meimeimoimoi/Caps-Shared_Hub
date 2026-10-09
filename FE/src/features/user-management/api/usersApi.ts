import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ManagedUser } from '../types'

/* Dev chạy demo thì đọc fixtures; mutation demo sửa thẳng fixtures.
 * TODO(api): BE auth chưa có vai trò/trạng thái khóa trong User; đối chiếu endpoint khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin/users'

export async function getUsers(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockUsers)
  return api.get<ManagedUser[]>(BASE, { signal })
}

/** Khóa (kèm lý do) hoặc mở khóa; tài khoản bị khóa không đăng nhập được */
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
    user.history.unshift({
      at: new Date().toISOString(),
      actor,
      text: locked
        ? `Khóa tài khoản: ${reason}`
        : `Mở khóa tài khoản${reason ? `: ${reason}` : ''}`,
    })
    return
  }
  await api.post(`${BASE}/${id}/${locked ? 'lock' : 'unlock'}`, { reason })
}

/** Gửi email đặt lại mật khẩu; admin không bao giờ thấy hay đặt mật khẩu hộ */
export async function sendPasswordReset(id: string, actor: string) {
  if (isExpertDemo) {
    const user = (await fixtures()).mockUsers.find((x) => x.id === id)
    user?.history.unshift({
      at: new Date().toISOString(),
      actor,
      text: 'Gửi email đặt lại mật khẩu',
    })
    return
  }
  await api.post(`${BASE}/${id}/password-reset`)
}
