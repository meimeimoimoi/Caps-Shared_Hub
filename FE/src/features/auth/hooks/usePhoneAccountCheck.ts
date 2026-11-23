import { useState } from 'react'
import {
  formatVietnamPhone,
  normalizeVietnamPhone,
} from '@/lib/validation/vietnamPhone'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

/**
 * - none: no valid expert phone yet
 * - same: the expert phone equals the account phone
 * - different: they differ (a work number is allowed, so this is information, not an error)
 * - accountEmpty: the account has no usable phone yet
 */
export type PhoneAccountStatus = 'none' | 'same' | 'different' | 'accountEmpty'

/**
 * Compares the expert's contact phone with the account phone after normalising both, so
 * "0901 111 111" and "+84901111111" count as the same number. An account phone that does not
 * normalise (auth only checks the loose phone format) counts as empty.
 */
export function usePhoneAccountCheck(expertPhone: string) {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [kept, setKept] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const current = normalizeVietnamPhone(expertPhone)
  const account = normalizeVietnamPhone(user?.phone ?? '')
  const status: PhoneAccountStatus = !current
    ? 'none'
    : !account
      ? 'accountEmpty'
      : account === current
        ? 'same'
        : 'different'

  /** Copies the expert phone to the account (the name is sent unchanged: the API replaces both). */
  const saveToAccount = async () => {
    if (!current || !user) return
    setSaving(true)
    setFailed(false)
    try {
      const saved = await authApi.updateProfile({
        displayName: user.name,
        phone: current,
      })
      updateUser({ phone: saved.phone })
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return {
    status,
    /** The user chose to keep this number different from the account; hide the notice for it */
    dismissed: kept !== null && kept === current,
    accountPhone: account ? formatVietnamPhone(account) : null,
    saving,
    failed,
    saveToAccount,
    keepDifferent: () => setKept(current),
  }
}
