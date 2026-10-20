import { TERMINATION_MATRIX } from '../constants'
import type { Escrow } from '../types'

/** Tiền một khoản Escrow được chia (VND): [hoàn Client, chuyên gia nhận, phí nền tảng].
 * Hoàn do chấm dứt → theo ma trận; còn lại (đã/sẽ chi trả) → theo tỷ lệ phí nền tảng hiện hành.
 * Phần lẻ dồn vào phí nền tảng để tổng luôn đúng bằng số tiền thanh toán. */
export function escrowSplit(
  e: Pick<Escrow, 'amount' | 'status' | 'termination'>,
  platformShare: number
) {
  const pct: readonly number[] =
    e.status === 'REFUNDED' || e.status === 'REFUND_PENDING' || e.status === 'REFUND_FAILED'
      ? e.termination
        ? TERMINATION_MATRIX[e.termination].split
        : [100, 0, 0]
      : [0, 100 - platformShare, platformShare]
  const client = Math.round((e.amount * pct[0]) / 100)
  const expert = Math.round((e.amount * pct[1]) / 100)
  return { client, expert, platform: e.amount - client - expert }
}
