import type { ESCROW_STATUS } from '@/lib/constants'
import type { HistoryEntry } from '@/features/expert-vetting/types'
import type { DisputeOutcome, TerminationReason } from '../constants'

export interface Escrow {
  caseId: string
  client: string
  expert: string
  amount: number // VND
  status: keyof typeof ESCROW_STATUS
  /** Chỉ có khi hoàn tiền do chấm dứt hồ sơ */
  termination?: TerminationReason
  /** Hạn quyết định / tự xác nhận, hoặc ngày hoàn tất */
  nextAt: string
}

export interface DisputeDecisionInput {
  outcome: DisputeOutcome
  reason: string
}

/** Một đoạn văn bản bằng chứng; `change` là phần bị xóa (bản nháp) hoặc được thêm (bản sửa) */
export interface EvidenceExcerpt {
  label: string
  text: string
  change: string
}

export interface Dispute {
  id: string // mã hồ sơ rà soát đang tranh chấp
  title: string
  client: string
  expert: string
  /** Căn cứ khiếu nại của Client */
  ground: string
  openedAt: string
  /** Có giá trị = đã ra quyết định trọng tài */
  resolvedAt?: string
  evidence: {
    draft: EvidenceExcerpt
    revision: EvidenceExcerpt
    note: string
  }
  complaint: {
    issue: string
    description: string
    attachment: string
  }
  history: HistoryEntry[]
}
