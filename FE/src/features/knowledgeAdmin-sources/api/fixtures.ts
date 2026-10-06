/* Dữ liệu demo cho sourcesApi.ts khi chạy dev (isExpertDemo). */
import type { CollectionOverview } from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

export const mockOverview: CollectionOverview = {
  schedule: {
    frequency: 'MONTHLY',
    lastRunAt: daysAgo(34),
    lastRunOk: true,
    nextRunAt: daysAgo(-26),
  },
  sources: [
    {
      id: 'vbpl',
      name: 'vbpl.vn · Cơ sở dữ liệu quốc gia về văn bản pháp luật',
      scope: 'Từ khóa: thu nhập doanh nghiệp',
      status: 'ACTIVE',
    },
    {
      id: 'mof',
      name: 'Cổng thông tin điện tử Bộ Tài chính',
      scope: 'Mục: văn bản pháp quy về thuế',
      status: 'ACTIVE',
    },
    {
      id: 'other',
      name: '[Nguồn khác do nhóm chốt]',
      scope: null,
      status: 'PAUSED',
    },
  ],
  runs: [
    { at: daysAgo(8), trigger: 'MANUAL', actor: 'Lê Thu Hà', newDocs: 2, newVersions: 1, unchanged: 9, errors: 0 },
    { at: daysAgo(34), trigger: 'SCHEDULED', newDocs: 3, newVersions: 0, unchanged: 8, errors: 0 },
    { at: daysAgo(65), trigger: 'SCHEDULED', newDocs: 1, newVersions: 1, unchanged: 9, errors: 1 },
  ],
}
