/* Dữ liệu demo cho pricingApi.ts khi chạy dev (isExpertDemo). */
import type { PricingOverview } from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

const expert = (id: string, name: string, fee: number) => ({ id, name, fee })

export const mockPricing: PricingOverview = {
  platformShare: 20,
  expertShare: 80,
  tiers: [
    {
      id: 'giai-trinh',
      group: 'Văn bản giải trình chi phí',
      templateCount: 3,
      min: 1_500_000,
      max: 3_000_000,
      step: 100_000,
      expertsAccepting: 12,
      outsideRange: 0,
      experts: [expert('e1', 'Đặng Mỹ Linh', 2_000_000), expert('e2', 'Phan Quốc Bảo', 2_500_000)],
      activeCases: 5,
      effectiveFrom: daysAgo(35),
    },
    {
      id: 'thuyet-minh',
      group: 'Thuyết minh quyết toán',
      templateCount: 2,
      min: 2_000_000,
      max: 4_000_000,
      step: 100_000,
      expertsAccepting: 9,
      outsideRange: 0,
      experts: [expert('e3', 'Lâm Chí Kiên', 2_200_000)],
      activeCases: 2,
      effectiveFrom: daysAgo(35),
    },
    {
      id: 'hoan-thue',
      group: 'Hồ sơ hoàn thuế',
      templateCount: 2,
      min: 1_500_000,
      max: 3_000_000,
      step: 100_000,
      expertsAccepting: 7,
      outsideRange: 0,
      experts: [
        expert('e4', 'Lê Thu Trang', 1_600_000),
        expert('e5', 'Võ Thị Hạnh', 1_500_000),
        expert('e1', 'Đặng Mỹ Linh', 2_000_000),
        expert('e2', 'Phan Quốc Bảo', 2_400_000),
        expert('e3', 'Lâm Chí Kiên', 1_900_000),
        expert('e6', 'Nguyễn Minh Anh', 2_800_000),
        expert('e7', 'Trịnh Bảo Ngọc', 3_000_000),
      ],
      activeCases: 3,
      effectiveFrom: daysAgo(35),
      scheduled: { min: 1_800_000, max: 3_500_000, effectiveFrom: daysAgo(-26), by: 'Trần An', createdAt: daysAgo(8) },
    },
    {
      id: 'uu-dai',
      group: 'Ưu đãi thuế',
      templateCount: 1,
      min: 2_500_000,
      max: 5_000_000,
      step: 100_000,
      expertsAccepting: 4,
      outsideRange: 1,
      experts: [expert('e6', 'Nguyễn Minh Anh', 2_200_000)],
      activeCases: 1,
      effectiveFrom: daysAgo(21),
    },
  ],
  creditRates: [
    { id: 'ai-question', action: 'Câu hỏi trợ lý AI', when: 'Giữ tạm khi gửi, trừ khi trả lời thành công', credits: 1 },
    { id: 'light-fee', action: 'Phí xử lý nhẹ', when: 'Ngoài phạm vi Thuế TNDN, hoặc không đủ căn cứ', credits: null },
    { id: 'draft-export', action: 'Tải bản nháp về', when: 'Xuất DOCX hoặc PDF', credits: 1 },
    { id: 'draft-preview', action: 'Tạo và xem trước bản nháp', when: 'Theo Final Flow V2: miễn phí', credits: 0, note: 'cần xác nhận' },
  ],
  // Giá gói chưa chốt nên để null; hiện "[giá gói]" trên màn
  creditPackages: [
    { id: 'g10', name: 'Gói 10', credits: 10, price: null, onSale: true, recommended: false, order: 1 },
    { id: 'g30', name: 'Gói 30', credits: 30, price: null, onSale: true, recommended: true, order: 2 },
    { id: 'g100', name: 'Gói 100', credits: 100, price: null, onSale: true, recommended: false, order: 3 },
  ],
  history: [
    { at: daysAgo(8), by: 'Trần An', text: 'Lên lịch khung mới cho Hồ sơ hoàn thuế: 1.800.000 – 3.500.000 đ.' },
    { at: daysAgo(21), by: 'Trần An', text: 'Thêm nhóm Ưu đãi thuế: 2.500.000 – 5.000.000 đ.' },
    { at: daysAgo(35), by: 'Trần An', text: 'Áp dụng khung giá quý IV cho 3 nhóm mẫu biểu.' },
  ],
}
