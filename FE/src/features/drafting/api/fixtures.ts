import type { InputValues, TemplateVersion } from '../types'

export const sampleInput: InputValues = {
  companyName: 'Công ty Minh An (dữ liệu minh họa)',
  taxCode: '0123456789',
  taxYear: '2025',
  transactionDate: '2025-03-15',
  expenseDescription:
    'Giải trình chi phí khấu hao ô tô phục vụ hoạt động kinh doanh. Các số liệu dưới đây do người dùng cung cấp, chưa được chuyên gia xác minh.',
  originalCost: '2400000000',
  depreciation: '240000000',
  deductibleAmount: '160000000',
  agency: 'Cơ quan thuế quản lý — minh họa',
}
export const templates: TemplateVersion[] = [
  {
    id: 'expense-explanation-v3',
    templateId: 'expense-explanation',
    version: 3,
    title: 'Văn bản giải trình chi phí với cơ quan thuế',
    description:
      'Soạn công văn giải trình một khoản chi phí với cơ quan thuế, từ sự kiện và số liệu bạn cung cấp.',
    category: 'Explanation',
    status: 'ACTIVE',
    updatedAt: '2026-10-05T03:00:00Z',
    schemaNote:
      'Bộ trường đề xuất cho bản demo, gồm 9 trường tham chiếu. Bộ trường đầy đủ và quy tắc kiểm tra cần nhóm xác nhận.',
    changelog: [
      'Sắp xếp các trường nhập liệu thành ba nhóm: thông tin doanh nghiệp, kỳ tính thuế và khoản chi phí.',
    ],
    fields: [
      {
        id: 'companyName',
        label: 'Tên doanh nghiệp',
        group: 'Thông tin doanh nghiệp',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      {
        id: 'taxCode',
        label: 'Mã số thuế',
        group: 'Thông tin doanh nghiệp',
        type: 'text',
        required: true,
        pattern: '^(\\d{10}|\\d{13})$',
        hint: 'Gồm 10 hoặc 13 chữ số (quy tắc demo, chờ xác nhận).',
      },
      {
        id: 'agency',
        label: 'Cơ quan thuế quản lý',
        group: 'Thông tin doanh nghiệp',
        type: 'text',
        required: true,
        maxLength: 250,
      },
      {
        id: 'taxYear',
        label: 'Năm tính thuế',
        group: 'Kỳ tính thuế',
        type: 'year',
        required: true,
      },
      {
        id: 'transactionDate',
        label: 'Ngày phát sinh giao dịch',
        group: 'Kỳ tính thuế',
        type: 'date',
        required: true,
      },
      {
        id: 'expenseDescription',
        label: 'Diễn giải khoản chi phí',
        group: 'Thông tin chi phí',
        type: 'textarea',
        required: true,
        maxLength: 6000,
      },
      {
        id: 'originalCost',
        label: 'Nguyên giá tài sản',
        group: 'Thông tin chi phí',
        type: 'money',
        required: true,
        hint: 'Đơn vị VND. Bạn tự nhập số liệu, AI không tính thay.',
      },
      {
        id: 'depreciation',
        label: 'Khấu hao trong kỳ',
        group: 'Thông tin chi phí',
        type: 'money',
        required: true,
        hint: 'Đơn vị VND. Bạn tự nhập số liệu, AI không tính thay.',
      },
      {
        id: 'deductibleAmount',
        label: 'Số tiền đề nghị được trừ',
        group: 'Thông tin chi phí',
        type: 'money',
        required: true,
        hint: 'Đơn vị VND. Số bạn nhập không phải kết luận về khoản được trừ khi tính thuế.',
      },
    ],
  },
  /* MOCK: phạm vi nghiệp vụ gồm 2 mẫu (Công văn giải trình, Tờ khai quyết toán).
   * Mỗi mẫu có nhiều phiên bản; chỉ 1 phiên bản ACTIVE được tạo bản nháp mới,
   * phiên bản cũ giữ lại để bản nháp đã tạo vẫn truy vết đúng phiên bản. */
  {
    id: 'expense-explanation-v2',
    templateId: 'expense-explanation',
    version: 2,
    title: 'Văn bản giải trình chi phí với cơ quan thuế',
    description:
      'Soạn công văn giải trình một khoản chi phí với cơ quan thuế, từ sự kiện và số liệu bạn cung cấp.',
    category: 'Explanation',
    status: 'INACTIVE',
    updatedAt: '2026-04-12T03:00:00Z',
    changelog: ['Bổ sung trường cơ quan thuế tiếp nhận.'],
    fields: [],
  },
  {
    id: 'expense-explanation-v1',
    templateId: 'expense-explanation',
    version: 1,
    title: 'Văn bản giải trình chi phí với cơ quan thuế',
    description:
      'Soạn công văn giải trình một khoản chi phí với cơ quan thuế, từ sự kiện và số liệu bạn cung cấp.',
    category: 'Explanation',
    status: 'INACTIVE',
    updatedAt: '2025-11-20T03:00:00Z',
    changelog: ['Phiên bản phát hành đầu tiên.'],
    fields: [],
  },
  {
    id: 'cit-finalization-v2',
    templateId: 'cit-finalization',
    version: 2,
    title: 'Tờ khai quyết toán thuế TNDN (Mẫu 03/TNDN)',
    description:
      'Lập tờ khai quyết toán thuế TNDN năm từ số liệu bạn đã xác nhận.',
    category: 'Finalization',
    status: 'ACTIVE',
    updatedAt: '2026-09-28T03:00:00Z',
    schemaNote:
      'Bộ trường nhập liệu cho Mẫu 03/TNDN đang chờ nhóm xác nhận, nên bản demo chưa hỗ trợ soạn thảo mẫu này.',
    changelog: ['Cập nhật nhóm chỉ tiêu theo mẫu tờ khai hiện hành.'],
    fields: [],
  },
  {
    id: 'cit-finalization-v1',
    templateId: 'cit-finalization',
    version: 1,
    title: 'Tờ khai quyết toán thuế TNDN (Mẫu 03/TNDN)',
    description:
      'Lập tờ khai quyết toán thuế TNDN năm từ số liệu bạn đã xác nhận.',
    category: 'Finalization',
    status: 'INACTIVE',
    updatedAt: '2025-12-15T03:00:00Z',
    changelog: ['Phiên bản phát hành đầu tiên.'],
    fields: [],
  },
]
