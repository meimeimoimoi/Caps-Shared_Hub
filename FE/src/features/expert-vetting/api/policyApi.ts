import { api } from '@/lib/api-client'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

export type PolicySettingKey =
  | 'MinYearsExperience'
  | 'ReapplyNotEligibleDays'
  | 'ReapplyCompetencyFailDays'
  | 'ReviewClaimHours'
  | 'MaxInformationRequests'
  | 'ReviewSlaDays'
  | 'FinalApprovalDays'

/** One adjustable expert policy value; updatedAt is null while the default applies */
export interface PolicySetting {
  key: PolicySettingKey
  value: number
  defaultValue: number
  minValue: number
  maxValue: number
  updatedAt: string | null
  updatedByUserId: string | null
}

export interface PolicySettingChange {
  id: string
  key: PolicySettingKey
  oldValue: number
  newValue: number
  reason: string
  changedByUserId: string
  changedAt: string
}

const BASE = '/api/v1/admin/experts/policy'

/** Values in force with their defaults and ranges (System Admin, ExpertApprove) */
export async function getExpertPolicy(signal?: AbortSignal) {
  const res = await api.get<Envelope<{ settings: PolicySetting[] }>>(BASE, {
    signal,
  })
  return res.data.settings
}

/**
 * Changes the given values; the reason is recorded with every change. `expected` holds each value as read:
 * the server answers POLICY_CHANGED when someone else changed it meanwhile.
 */
export async function updateExpertPolicy(
  values: Partial<Record<PolicySettingKey, number>>,
  expected: Partial<Record<PolicySettingKey, number>>,
  reason: string
) {
  const res = await api.put<Envelope<{ settings: PolicySetting[] }>>(BASE, {
    values,
    expected,
    reason: reason.trim() || null,
  })
  return res.data.settings
}

/** Most recent changes first */
export async function getExpertPolicyHistory(signal?: AbortSignal) {
  const res = await api.get<Envelope<PolicySettingChange[]>>(
    `${BASE}/history`,
    { signal }
  )
  return res.data
}
