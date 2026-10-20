import { api } from '@/lib/api-client'
import type { PricingAudit, PricingInput, PricingWorkspace } from './model'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface ServerVersion {
  id: string
  sequence: number
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
  reason: string | null
  status: PricingWorkspace['versions'][number]['status']
  autoApproved: boolean
  changePercent: number | null
  reviewNote: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ServerWorkspace {
  qualificationId: string
  serviceCode: string
  serviceName: string
  revision: number
  minPrice: number
  maxPrice: number
  autoApproveMaxChangePercent: number
  canEdit: boolean
  versions: ServerVersion[]
  audit: {
    versionId: string
    action: PricingAudit['action']
    at: string
    actor: string
    note: string | null
  }[]
}

const BASE = '/api/v1/experts/me/pricing'

const toWorkspace = (w: ServerWorkspace): PricingWorkspace => ({
  revision: w.revision,
  autoApproveMaxChangePercent: w.autoApproveMaxChangePercent,
  versions: w.versions.map((v) => ({
    id: v.id,
    sequence: v.sequence,
    amount: String(v.amount),
    effectiveFrom: v.effectiveFrom,
    effectiveTo: v.effectiveTo,
    reason: v.reason ?? '',
    status: v.status,
    autoApproved: v.autoApproved,
    changePercent: v.changePercent,
    reviewNote: v.reviewNote,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  })),
  audit: w.audit.map((a) => ({
    versionId: a.versionId,
    action: a.action,
    at: a.at,
    actor: a.actor,
  })),
})

/** The expert's prices for one service (versions newest first, audit oldest first) */
export async function getPricing(serviceId: string, signal?: AbortSignal) {
  const res = await api.get<Envelope<ServerWorkspace>>(
    `${BASE}/${encodeURIComponent(serviceId)}`,
    { signal }
  )
  return toWorkspace(res.data)
}

/** Saves the draft; submit applies the auto-approval rule or sends it to a System Admin */
export async function savePricing(
  serviceId: string,
  input: PricingInput,
  revision: number,
  submit: boolean
) {
  const res = await api.put<Envelope<ServerWorkspace>>(
    `${BASE}/${encodeURIComponent(serviceId)}`,
    {
      amount: Number(input.amount),
      effectiveFrom: input.effectiveFrom,
      reason: input.reason.trim() || null,
      revision,
      submit,
    }
  )
  return toWorkspace(res.data)
}
