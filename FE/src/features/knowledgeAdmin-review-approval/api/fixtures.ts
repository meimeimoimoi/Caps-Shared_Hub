/* Dữ liệu demo cho knowledgeApi.ts khi chạy dev (isExpertDemo). */
import type {
  ArticleChange,
  KnowledgeDocument,
  PipelineSummary,
  VersionComparison,
} from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

export const mockSummary: PipelineSummary = {
  collectedThisMonth: 12,
  parsing: 1,
  pending: 4,
  indexing: 1,
  indexFailed: 1,
  indexed: 126,
}

export const mockDocuments: KnowledgeDocument[] = [
  {
    id: 'doc-78-2014',
    number: '78/2014/TT-BTC',
    title: 'Hướng dẫn thi hành Luật Thuế thu nhập doanh nghiệp',
    docType: 'Thông tư',
    source: 'UPLOAD',
    stage: 'review',
    version: null,
    parseWarnings: 2,
    effectiveAt: '2014-08-02',
    queuedAt: daysAgo(9),
  },
  {
    id: 'doc-vbhn-tndn',
    number: '[số]/VBHN-BTC',
    title: 'Văn bản hợp nhất Thông tư hướng dẫn thuế TNDN',
    docType: 'VB hợp nhất',
    source: 'CRAWL',
    stage: 'review',
    version: { no: 3, changed: true },
    parseWarnings: 0,
    effectiveAt: null,
    queuedAt: daysAgo(10),
  },
  {
    id: 'doc-132-2020',
    number: '132/2020/NĐ-CP',
    title: 'Quản lý thuế với doanh nghiệp có giao dịch liên kết',
    docType: 'Nghị định',
    source: 'CRAWL',
    stage: 'review',
    version: null,
    parseWarnings: 0,
    effectiveAt: '2020-12-20',
    queuedAt: daysAgo(10),
  },
  {
    id: 'doc-218-2013',
    number: '218/2013/NĐ-CP',
    title: 'Quy định chi tiết và hướng dẫn thi hành Luật Thuế TNDN',
    docType: 'Nghị định',
    source: 'CRAWL',
    stage: 'review',
    version: null,
    parseWarnings: 1,
    effectiveAt: '2014-02-15',
    queuedAt: daysAgo(10),
  },
  {
    id: 'doc-96-2015',
    number: '96/2015/TT-BTC',
    title: 'Hướng dẫn về thuế TNDN tại Nghị định 12/2015/NĐ-CP',
    docType: 'Thông tư',
    source: 'CRAWL',
    stage: 'parse',
    version: null,
    parseWarnings: 0,
    effectiveAt: '2015-08-06',
    queuedAt: daysAgo(1),
  },
  {
    id: 'doc-20-2017',
    number: '20/2017/NĐ-CP',
    title: 'Quản lý thuế đối với doanh nghiệp có giao dịch liên kết',
    docType: 'Nghị định',
    source: 'CRAWL',
    stage: 'index',
    version: { no: 2, changed: false },
    parseWarnings: 0,
    effectiveAt: '2017-05-01',
    queuedAt: daysAgo(2),
  },
  {
    id: 'doc-14-2008',
    number: '14/2008/QH12',
    title: 'Luật Thuế thu nhập doanh nghiệp',
    docType: 'Luật',
    source: 'UPLOAD',
    stage: 'indexed',
    version: null,
    parseWarnings: 0,
    effectiveAt: '2009-01-01',
    queuedAt: daysAgo(20),
  },
]

const unchanged26 = { text: 'Khoản 2 · Điểm 2.6: [nội dung không đổi]' }
const modified = (article: number, heading: string): ArticleChange => ({
  article,
  heading,
  kind: 'MODIFIED',
  before: [
    { text: 'Khoản 2 · Điểm 2.5: [nội dung điểm 2.5 phiên bản cũ]', change: 'removed' },
    unchanged26,
  ],
  after: [
    { text: 'Khoản 2 · Điểm 2.5: [nội dung điểm 2.5 đã sửa đổi]', change: 'added' },
    unchanged26,
  ],
})

/** Khóa theo documentId */
export const mockComparisons: Record<string, VersionComparison> = {
  'doc-vbhn-tndn': {
    documentId: 'doc-vbhn-tndn',
    number: '[số]/VBHN-BTC',
    title: 'Văn bản hợp nhất Thông tư hướng dẫn thuế TNDN',
    version: 3,
    prevVersion: 2,
    collectedAt: daysAgo(10),
    collectedBy: 'AUTO',
    changes: [
      modified(6, 'Điều 6. Các khoản chi được trừ và không được trừ'),
      modified(9, 'Điều 9. Xác định chi phí khấu hao tài sản cố định'),
      modified(12, 'Điều 12. Doanh thu để tính thu nhập chịu thuế'),
      {
        article: 20,
        heading: 'Điều 20. [Tên điều mới]',
        kind: 'ADDED',
        before: null,
        after: [{ text: 'Khoản 1: [nội dung điều mới]', change: 'added' }],
      },
      modified(22, 'Điều 22. Ưu đãi thuế thu nhập doanh nghiệp'),
    ],
  },
}

