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

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
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
  creditPackages: CreditPackage[]
  history: PriceChange[]
}
