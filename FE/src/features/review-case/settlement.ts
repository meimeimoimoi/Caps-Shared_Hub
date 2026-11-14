/* Flow 5 · Settlement matrix (Normal / Termination / Dispute).
 * split = % [refund to client, expert, platform]; one rule per case.
 * Split agreed 2026-11-11: platform 40 / expert 60; an incident refunds 50% and splits the rest 60/40.
 * Expert-side failures keep a full refund until the open question on expert declines is answered.
 * ponytail: FE chỉ hiển thị; số tiền thật do BE quyết toán. Admin escrow vẫn dùng TERMINATION_MATRIX
 * (tên khóa cũ, cùng tỷ lệ) — gộp về bảng này khi BE chốt enum. */
export const SETTLEMENT_POLICY = {
  USER_ACCEPTED: { type: 'NORMAL', split: [0, 60, 40] },
  AUTO_CONFIRMED: { type: 'NORMAL', split: [0, 60, 40] },
  USER_NON_RESPONSE: { type: 'TERMINATION', split: [0, 60, 40] },
  USER_CANCELLED: { type: 'TERMINATION', split: [50, 30, 20] },
  EXPERT_START_TIMEOUT: { type: 'TERMINATION', split: [100, 0, 0] },
  // Client cancels after paying but before the expert starts (BR-M37)
  USER_CANCELLED_BEFORE_START: { type: 'TERMINATION', split: [100, 0, 0] },
  EXPERT_ABANDON: { type: 'TERMINATION', split: [100, 0, 0] },
  SYSTEM_ERROR: { type: 'TERMINATION', split: [100, 0, 0] },
  RESOLVE_REFUND_USER: { type: 'DISPUTE', split: [100, 0, 0] },
  RESOLVE_PAY_EXPERT: { type: 'DISPUTE', split: [0, 60, 40] },
  RESOLVE_PARTIAL: { type: 'DISPUTE', split: [50, 30, 20] },
} as const

export type SettlementRule = keyof typeof SETTLEMENT_POLICY

/** Chia số tiền (VND nguyên). Phần lẻ dồn vào phí nền tảng để tổng luôn đúng bằng gross. */
export function settle(gross: number, rule: SettlementRule) {
  const [r, e] = SETTLEMENT_POLICY[rule].split
  const refund = Math.round((gross * r) / 100)
  const expert = Math.round((gross * e) / 100)
  return { gross, refund, expert, platform: gross - refund - expert }
}
