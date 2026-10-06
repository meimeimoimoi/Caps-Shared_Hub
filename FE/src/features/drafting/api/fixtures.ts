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
    version: 3,
    title: 'Văn bản giải trình chi phí với cơ quan thuế',
    description:
      'Prepare an explanation of a business expense, using the facts and amounts you provide.',
    category: 'Explanation',
    status: 'ACTIVE',
    updatedAt: '2026-10-05T03:00:00Z',
    schemaNote:
      'Proposed demo schema: the 9 visible reference fields only. Full schema and validation rules require team confirmation.',
    changelog: [
      'Demo v3: groups the visible fields into business, period and expense information. This is synthetic metadata.',
    ],
    fields: [
      {
        id: 'companyName',
        label: 'Company name',
        group: 'Business information',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      {
        id: 'taxCode',
        label: 'Tax code',
        group: 'Business information',
        type: 'text',
        required: true,
        pattern: '^(\\d{10}|\\d{13})$',
        hint: 'Demo rule: 10 or 13 digits; pending schema confirmation.',
      },
      {
        id: 'agency',
        label: 'Managing tax authority',
        group: 'Business information',
        type: 'text',
        required: true,
        maxLength: 250,
      },
      {
        id: 'taxYear',
        label: 'Relevant tax year',
        group: 'Tax period',
        type: 'year',
        required: true,
      },
      {
        id: 'transactionDate',
        label: 'Transaction date',
        group: 'Tax period',
        type: 'date',
        required: true,
      },
      {
        id: 'expenseDescription',
        label: 'Expense explanation',
        group: 'Expense information',
        type: 'textarea',
        required: true,
        maxLength: 6000,
      },
      {
        id: 'originalCost',
        label: 'Original asset cost',
        group: 'Expense information',
        type: 'money',
        required: true,
        hint: 'VND. Supply your own figure; AI does not calculate it.',
      },
      {
        id: 'depreciation',
        label: 'Depreciation for the period',
        group: 'Expense information',
        type: 'money',
        required: true,
        hint: 'VND. Supply your own figure; AI does not calculate it.',
      },
      {
        id: 'deductibleAmount',
        label: 'Amount claimed as deductible',
        group: 'Expense information',
        type: 'money',
        required: true,
        hint: 'VND. This input is not a determination of tax deductibility.',
      },
    ],
  },
  ...[
    [
      'non-deductible-v2',
      'Thuyết minh chi phí không được trừ khi quyết toán',
      'Finalization',
      2,
    ],
    ['refund-v2', 'Công văn đề nghị hoàn thuế TNDN nộp thừa', 'Refund', 2],
    [
      'supplement-v1',
      'Công văn giải trình, bổ sung hồ sơ khai thuế',
      'Explanation',
      1,
    ],
    [
      'interest-v1',
      'Hồ sơ xác định chi phí lãi vay được trừ',
      'Finalization',
      1,
    ],
    ['incentive-v1', 'Tờ trình áp dụng ưu đãi thuế TNDN', 'Incentive', 1],
  ].map(([id, title, category, version]) => ({
    id: String(id),
    title: String(title),
    category: String(category),
    version: Number(version),
    description:
      'Reference template. A confirmed input schema is not available in this demo.',
    status: 'ACTIVE' as const,
    updatedAt: '2026-10-05T03:00:00Z',
    fields: [],
  })),
]
