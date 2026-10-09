import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { LoginFormValues, User } from '../types'

interface BackendEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

interface BackendAuthPayload {
  accessToken: string
  userId: string
  email: string
  displayName: string
}

function toUser(p: BackendAuthPayload): { user: User; token: string } {
  return {
    user: { id: p.userId, email: p.email, name: p.displayName },
    token: p.accessToken,
  }
}

export const authApi = {
  login: async (values: LoginFormValues) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>('/api/auth/login', values)
    return toUser(res.data)
  },
  register: async (values: LoginFormValues & { displayName?: string }) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>('/api/auth/register', values)
    return toUser(res.data)
  },
  me: () => api.get<BackendEnvelope<{ userId: string; email: string }>>('/api/auth/me'),
  /** Tải ảnh đại diện, trả URL ảnh mới.
   * TODO(api): đối chiếu endpoint với BE khi có Swagger. */
  uploadAvatar: async (file: File): Promise<string> => {
    // MOCK: dev demo chưa có BE lưu ảnh, đọc thành data URL để hiện ngay
    if (isExpertDemo)
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    const body = new FormData()
    body.append('file', file)
    // apiClient mặc định gửi JSON; FormData cần header multipart
    const res = await api.post<BackendEnvelope<{ avatarUrl: string }>>('/api/auth/me/avatar', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.avatarUrl
  },
  removeAvatar: async () => {
    if (isExpertDemo) return
    await api.del('/api/auth/me/avatar')
  },
  /** Sai mật khẩu hiện tại → BE trả lỗi, ApiError mang message của BE.
   * TODO(api): đối chiếu endpoint với BE khi có Swagger. */
  changePassword: async (body: { currentPassword: string; newPassword: string }) => {
    // MOCK: dev demo chưa có đăng nhập thật, giả lập thành công
    if (isExpertDemo) return
    await api.post('/api/auth/change-password', body)
  },
  /** BE luôn trả thành công dù email có tồn tại hay không (chống dò tài khoản).
   * TODO(api): BE chưa có endpoint, đối chiếu khi có Swagger. */
  requestPasswordReset: async (email: string) => {
    if (isExpertDemo) return
    await api.post('/api/auth/forgot-password', { email })
  },
  /** Token lấy từ liên kết trong email; hết hạn/sai → BE trả lỗi.
   * TODO(api): BE chưa có endpoint, đối chiếu khi có Swagger. */
  resetPassword: async (body: { token: string; newPassword: string }) => {
    // MOCK: demo nhận token "expired" để xem trạng thái liên kết hết hạn
    if (isExpertDemo) {
      if (body.token === 'expired') throw new Error('RESET_TOKEN_EXPIRED')
      return
    }
    await api.post('/api/auth/reset-password', body)
  },
}
