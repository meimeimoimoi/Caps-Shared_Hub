import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { SESSION_EXPIRED_EVENT, SESSION_REFRESHED_EVENT } from './session-events'
import { clearPrivateQueries } from './query-client'

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '')
  return '/api'
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  // X-Caps-Client: auth service từ chối mọi request ghi vào /api/v1/auth thiếu header này (chống CSRF)
  headers: { 'Content-Type': 'application/json', 'X-Caps-Client': 'spa' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type RefreshedSession = { accessToken: string; user: unknown }

// 401 từ /api/v1/auth là lỗi nghiệp vụ (sai mật khẩu, token email sai, cookie hết hạn…),
// không phải access token hết hạn, nên không tự refresh. Riêng resend-verification dùng bearer.
const canRefresh = (url: string) =>
  !url.includes('/api/v1/auth/') || url.endsWith('/api/v1/auth/resend-verification')

let refreshing: Promise<string> | null = null

/** Single-flight: nhiều request cùng gặp 401 chỉ dùng chung một lần refresh,
 * vì BE xoay vòng refresh token và coi việc dùng lại token cũ là bị đánh cắp. */
export function refreshAccessToken(staleToken?: string | null): Promise<string> {
  refreshing ??= withRefreshLock(async () => {
    // Tab khác vừa refresh xong (token dùng chung qua localStorage): dùng luôn, không refresh lại
    // vì gửi cookie đã xoay vòng sẽ bị BE coi là bị đánh cắp và thu hồi mọi phiên.
    const current = localStorage.getItem('auth_token')
    if (staleToken && current && current !== staleToken) return current
    const { data } = await apiClient.post<{ data: RefreshedSession }>(
      '/api/v1/auth/refresh-token',
      {},
      { withCredentials: true },
    )
    const { accessToken, user } = data.data
    localStorage.setItem('auth_token', accessToken)
    window.dispatchEvent(
      new CustomEvent(SESSION_REFRESHED_EVENT, { detail: { accessToken, user } }),
    )
    return accessToken
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Khóa giữa các tab cùng trình duyệt: tại một thời điểm chỉ một tab được refresh. */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('caps-auth-refresh', task)
    : task()
}

function expireSession() {
  clearPrivateQueries()
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const status = error.response?.status
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const url = config?.url ?? ''
    const hadSession = !!localStorage.getItem('auth_token')
    if (status === 401 && config && hadSession && !config._retried && canRefresh(url)) {
      config._retried = true
      const sent = String(config.headers.Authorization ?? '').replace(/^Bearer /, '')
      try {
        const token = await refreshAccessToken(sent)
        config.headers.Authorization = `Bearer ${token}`
        return apiClient(config)
      } catch {
        expireSession()
      }
    } else if (status === 401 && hadSession && config?._retried) {
      expireSession()
    }
    // Rate limiter / JWT middleware có thể trả body rỗng, nên luôn giữ status để phân loại lỗi.
    const data = error.response?.data
    const backendMessage =
      (typeof data === 'object' && data && (data.message || data.detail)) || error.message
    return Promise.reject(new ApiError(backendMessage, status, data?.code))
  },
)

// Typed helpers — keep AxiosResponse typing (don't unwrap globally).
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((r) => r.data),
  post: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, body, config).then((r) => r.data),
  put: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, body, config).then((r) => r.data),
  del: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
}
