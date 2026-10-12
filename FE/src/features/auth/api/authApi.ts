import { api, apiClient, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { LoginFormValues, User } from '../types'

interface BackendEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

/** MeResponse của auth service (/api/v1/users/me và phần user trong AuthResponse) */
export interface BackendMe {
  userId: string
  email: string
  displayName: string
  phone: string | null
  status: string
  emailVerified: boolean
  roles: string[]
  permissions: string[]
  avatarUrl?: string | null
}

interface BackendAuthPayload {
  accessToken: string
  expiresIn: number
  user: BackendMe
}

export function toUser(me: BackendMe): User {
  return {
    id: me.userId,
    email: me.email,
    name: me.displayName,
    phone: me.phone,
    status: me.status,
    emailVerified: me.emailVerified,
    roles: me.roles,
    permissions: me.permissions,
    avatarUrl: absoluteUrl(me.avatarUrl),
  }
}

/** Ảnh đại diện là đường dẫn tương đối qua gateway; thẻ img cần URL đầy đủ */
function absoluteUrl(path: string | null | undefined) {
  if (!path) return undefined
  return /^https?:/.test(path) ? path : (apiClient.defaults.baseURL ?? '') + path
}

/** Dev: trang chuyên gia/khách hàng cho xem bằng tài khoản minh họa khi chưa đăng nhập thật */
const demoOnly = () => isExpertDemo && !localStorage.getItem('auth_token')

/** Đổi lỗi nghiệp vụ của BE thành khóa i18n để form hiển thị đúng ngôn ngữ */
type AuthKey = 'avatar.typeError' | 'avatar.sizeError' | 'changePassword.wrongCurrent' | 'changePassword.sameAsCurrent'

function localized(e: unknown, codes: Record<string, AuthKey>) {
  const key = e instanceof ApiError && e.code ? codes[e.code] : undefined
  if (key && e instanceof ApiError) {
    return new ApiError(String(i18n.t(key, { ns: 'auth' })), e.status, e.code)
  }
  return e
}

function toSession(p: BackendAuthPayload): { user: User; token: string } {
  return { user: toUser(p.user), token: p.accessToken }
}

/* Refresh token nằm trong cookie HttpOnly (path /api/v1/auth), nên mọi lệnh gọi
 * /api/v1/auth phải gửi kèm cookie. */
const withCookie = { withCredentials: true } as const

export const authApi = {
  login: async (values: LoginFormValues) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>(
      '/api/v1/auth/login',
      { email: values.email, password: values.password },
      withCookie,
    )
    return toSession(res.data)
  },
  register: async (values: { email: string; password: string; displayName?: string }) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>(
      '/api/v1/auth/register',
      values,
      withCookie,
    )
    return toSession(res.data)
  },
  /** Đổi refresh cookie lấy access token mới; cookie bị xoay vòng sau mỗi lần gọi. */
  refresh: async () => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>(
      '/api/v1/auth/refresh-token',
      {},
      withCookie,
    )
    return toSession(res.data)
  },
  logout: async () => {
    await api.post('/api/v1/auth/logout', {}, withCookie)
  },
  me: async () => {
    const res = await api.get<BackendEnvelope<BackendMe>>('/api/v1/users/me')
    return toUser(res.data)
  },
  /** Token lấy từ liên kết trong email xác thực; chỉ dùng được một lần. */
  verifyEmail: async (token: string) => {
    await api.post('/api/v1/auth/verify-email', { token }, withCookie)
  },
  /** Mã 6 số trong email xác nhận; đúng thì BE trả phiên mới đã kích hoạt (sai 5 lần bị khóa). */
  verifyEmailCode: async (code: string) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>(
      '/api/v1/auth/verify-email-code',
      { code },
      withCookie
    )
    return toSession(res.data)
  },
  /** Cần phiên đăng nhập (kể cả đang chờ xác thực); BE giới hạn 60 giây/lần. */
  resendVerification: async () => {
    await api.post('/api/v1/auth/resend-verification', {}, withCookie)
  },
  /** Tải ảnh đại diện (JPG/PNG/WebP, tối đa 2 MB), trả URL ảnh mới. */
  uploadAvatar: async (file: File): Promise<string> => {
    // MOCK: tài khoản minh họa (chưa đăng nhập thật) đọc thành data URL để hiện ngay
    if (demoOnly())
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    const body = new FormData()
    body.append('file', file)
    try {
      // apiClient mặc định gửi JSON; FormData cần header multipart
      const res = await api.put<BackendEnvelope<BackendMe>>('/api/v1/users/me/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return toUser(res.data).avatarUrl ?? ''
    } catch (e) {
      throw localized(e, {
        AVATAR_INVALID_TYPE: 'avatar.typeError',
        AVATAR_TOO_LARGE: 'avatar.sizeError',
      })
    }
  },
  removeAvatar: async () => {
    if (demoOnly()) return
    await api.del('/api/v1/users/me/avatar')
  },
  /** Thành công thì BE đăng xuất mọi thiết bị khác và cấp phiên mới cho thiết bị này. */
  changePassword: async (body: { currentPassword: string; newPassword: string }) => {
    // MOCK: tài khoản minh họa chưa có đăng nhập thật, giả lập thành công
    if (demoOnly()) return
    try {
      const res = await api.post<BackendEnvelope<BackendAuthPayload>>(
        '/api/v1/auth/change-password',
        body,
        withCookie,
      )
      return toSession(res.data)
    } catch (e) {
      throw localized(e, {
        CURRENT_PASSWORD_INVALID: 'changePassword.wrongCurrent',
        PASSWORD_UNCHANGED: 'changePassword.sameAsCurrent',
      })
    }
  },
  /** BE luôn trả thành công dù email có tồn tại hay không (chống dò tài khoản). */
  requestPasswordReset: async (email: string) => {
    await api.post('/api/v1/auth/forgot-password', { email }, withCookie)
  },
  /** Token lấy từ liên kết trong email; hết hạn/sai → BE trả lỗi. Thành công thì mọi phiên bị thu hồi. */
  resetPassword: async (body: { token: string; newPassword: string }) => {
    await api.post(
      '/api/v1/auth/reset-password',
      { token: body.token, password: body.newPassword },
      withCookie,
    )
  },
}
