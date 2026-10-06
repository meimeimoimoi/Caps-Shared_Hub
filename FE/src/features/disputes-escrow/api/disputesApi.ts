import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN } from '@/features/expert-vetting/constants'
import { DISPUTE_OUTCOME } from '../constants'
import type { Dispute, DisputeDecisionInput, Escrow } from '../types'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin'

/* ── Khiếu nại ── */
export async function getDisputes(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockDisputes)
  return api.get<Dispute[]>(`${BASE}/disputes`, { signal })
}

export async function getDispute(id: string, signal?: AbortSignal): Promise<Dispute | null> {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    return d ? structuredClone(d) : null
  }
  return api.get<Dispute>(`${BASE}/disputes/${id}`, { signal })
}

export async function decideDispute(id: string, body: DisputeDecisionInput) {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    if (!d) return
    d.resolvedAt = new Date().toISOString()
    d.history.unshift({
      at: d.resolvedAt,
      actor: CURRENT_ADMIN,
      text: `Ra quyết định: ${DISPUTE_OUTCOME[body.outcome].label}. ${body.reason}`,
    })
    return
  }
  await api.post(`${BASE}/disputes/${id}/decision`, body)
}

/* ── Escrow ── */
export async function getEscrows(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockEscrows)
  return api.get<Escrow[]>(`${BASE}/escrows`, { signal })
}
