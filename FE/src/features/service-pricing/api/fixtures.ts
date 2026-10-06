/* Dữ liệu demo cho pricingApi.ts khi chạy dev (isExpertDemo). */
import type { PricingOverview } from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

export const mockPricing: PricingOverview = {
  platformShare: 20,
  expertShare: 80,
  tiers: [
    { id: 'giai-trinh', group: 'Văn bản giải trình chi phí', templateCount: 3, min: 1_500_000, max: 3_000_000, step: 100_000, expertsAccepting: 12, outsideRange: 0, effectiveFrom: daysAgo(35) },
    { id: 'thuyet-minh', group: 'Thuyết minh quyết toán', templateCount: 2, min: 2_000_000, max: 4_000_000, step: 100_000, expertsAccepting: 9, outsideRange: 0, effectiveFrom: daysAgo(35) },
    {
      id: 'hoan-thue',
      group: 'Hồ sơ hoàn thuế',
      templateCount: 2,
      min: 1_500_000,
      max: 3_000_000,
      step: 100_000,
      expertsAccepting: 7,
      outsideRange: 0,
      effectiveFrom: daysAgo(35),
      scheduled: { min: 1_800_000, max: 3_500_000, effectiveFrom: daysAgo(-26), by: 'Trần An', createdAt: daysAgo(8) },
    },
    { id: 'uu-dai', group: 'Ưu đãi thuế', templateCount: 1, min: 2_500_000, max: 5_000_000, step: 100_000, expertsAccepting: 4, outsideRange: 1, effectiveFrom: daysAgo(21) },
  ],
  creditPackages: [
    { id: 'p20', name: 'Gói cơ bản', credits: 20, price: 99_000 },
    { id: 'p60', name: 'Gói tiêu chuẩn', credits: 60, price: 269_000 },
    { id: 'p150', name: 'Gói doanh nghiệp', credits: 150, price: 599_000 },
  ],
  history: [
    { at: daysAgo(8), by: 'Trần An', text: 'Lên lịch khung mới cho Hồ sơ hoàn thuế: 1.800.000 – 3.500.000 đ.' },
    { at: daysAgo(21), by: 'Trần An', text: 'Thêm nhóm Ưu đãi thuế: 2.500.000 – 5.000.000 đ.' },
    { at: daysAgo(35), by: 'Trần An', text: 'Áp dụng khung giá quý IV cho 3 nhóm mẫu biểu.' },
  ],
}
