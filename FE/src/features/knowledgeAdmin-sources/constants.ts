/* Tần suất thu thập định kỳ → câu mô tả giờ chạy */
export const FREQUENCY = {
  DAILY: { label: '1 ngày/lần', hint: 'Chạy lúc 03:00 hàng ngày.' },
  WEEKLY: { label: '1 tuần/lần', hint: 'Chạy lúc 03:00 thứ Hai hàng tuần.' },
  MONTHLY: { label: '1 tháng/lần', hint: 'Chạy lúc 03:00 ngày 1 hàng tháng.' },
} as const
export type Frequency = keyof typeof FREQUENCY

export const SOURCE_STATUS = {
  ACTIVE: { label: 'Đang dùng', tone: 'success' },
  PAUSED: { label: 'Tạm dừng', tone: 'neutral' },
} as const

export const RUN_TRIGGER = { MANUAL: 'Thủ công', SCHEDULED: 'Định kỳ' } as const
