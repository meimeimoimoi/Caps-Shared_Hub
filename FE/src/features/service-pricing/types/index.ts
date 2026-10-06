/** Khung phí rà soát cho một nhóm mẫu biểu (VND) */
export interface PriceTier {
  id: string
  group: string // Nhóm mẫu biểu, vd. "Hồ sơ hoàn thuế"
  templateCount: number
  min: number
  max: number
  step: number
  /** Số Expert đang nhận nhóm này */
  expertsAccepting: number
  /** Số Expert đặt phí ngoài khung (cần nhắc điều chỉnh) */
  outsideRange: number
  /** Phí từng Expert đang đặt, để tính ai rơi ra ngoài khung mới */
  experts: { id: string; name: string; fee: number }[]
  /** Case đang chạy của nhóm; giữ nguyên giá đã thanh toán */
  activeCases: number
  effectiveFrom: string
  /** Thay đổi đã lên lịch, chưa hiệu lực */
  scheduled?: {
    min: number
    max: number
    effectiveFrom: string
    by: string
    createdAt: string
  }
}

/** Khung mới gửi lên khi lên lịch (ngày dạng yyyy-mm-dd) */
export interface TierChangeInput {
  min: number
  max: number
  step: number
  effectiveFrom: string
  reason: string
}

/** Tạo khung cho nhóm mẫu biểu mới */
export interface NewTierInput extends TierChangeInput {
  group: string
}

/** Thêm (id rỗng) hoặc sửa gói nạp */
export type PackageInput = Omit<CreditPackage, 'id'> & { id?: string }

/** Đơn giá credit của một thao tác */
export interface CreditRate {
  id: string
  action: string
  /** Khi nào tính phí */
  when: string
  /** null = chưa chốt giá */
  credits: number | null
  /** Ghi chú kèm giá, vd. "cần xác nhận" */
  note?: string
}

/** Gói nạp credit bán qua PayOS, hiện trên paywall */
export interface CreditPackage {
  id: string
  name: string
  credits: number
  /** VND; null = chưa chốt giá */
  price: number | null
  onSale: boolean
  /** Gói được đánh dấu gợi ý trên paywall */
  recommended: boolean
  /** Thứ tự hiện trên paywall, 1 = đầu tiên */
  order: number
}

export interface PriceChange {
  at: string
  by: string
  text: string
}

export interface PricingOverview {
  /** % phí rà soát nền tảng giữ lại / chuyên gia nhận; theo chính sách, không sửa ở đây */
  platformShare: number
  expertShare: number
  tiers: PriceTier[]
  creditRates: CreditRate[]
  creditPackages: CreditPackage[]
  history: PriceChange[]
}
