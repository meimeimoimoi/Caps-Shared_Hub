import { useState } from 'react'
import { ApiError } from '@/lib/api-client'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import { notifyEmailVerified } from '../utils/emailVerifiedSignal'

export type CodeError =
  | { key: 'verify.codeInvalid'; count: number }
  | { key: 'verify.codeExpired' | 'verify.codeLocked' | 'verify.codeFailed' }

/** Xác nhận email bằng mã 6 số: thành công thì nhận phiên ACTIVE ngay và báo cho các tab khác. */
export function useEmailCodeVerification(onVerified?: () => void) {
  const [code, setCodeState] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CodeError | null>(null)

  const verify = async (value = code) => {
    if (busy || !/^\d{6}$/.test(value)) return
    setBusy(true)
    setError(null)
    try {
      const { user, token } = await authApi.verifyEmailCode(value)
      useAuthStore.getState().renewSession(user, token)
      notifyEmailVerified()
      onVerified?.()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ALREADY_VERIFIED') {
        // Đã xác nhận bằng liên kết ở nơi khác: chỉ cần lấy phiên mới
        await authApi.me().catch(() => undefined)
        onVerified?.()
      } else if (e instanceof ApiError && e.code === 'CODE_INVALID') {
        const left = Number(/(\d+) attempts? left/.exec(e.message)?.[1] ?? 0)
        setError({ key: 'verify.codeInvalid', count: left })
        setCodeState('')
      } else if (e instanceof ApiError && e.code === 'CODE_EXPIRED') {
        setError({ key: 'verify.codeExpired' })
      } else if (e instanceof ApiError && e.code === 'CODE_LOCKED') {
        setError({ key: 'verify.codeLocked' })
      } else {
        setError({ key: 'verify.codeFailed' })
      }
    } finally {
      setBusy(false)
    }
  }

  /** Chỉ giữ chữ số; đủ 6 số (gõ, dán hoặc điện thoại tự điền) thì tự xác nhận. */
  const setCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCodeState(digits)
    if (error) setError(null)
    if (digits.length === 6) void verify(digits)
  }

  return {
    code,
    setCode,
    verify,
    busy,
    error,
    clearError: () => setError(null),
  }
}
