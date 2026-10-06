/* Dữ liệu demo cho knowledgeApi.ts khi chạy dev (isExpertDemo). */
import type {
  DocumentDetail,
  DocumentReview,
  ReviewArticle,
  UnitStatus,
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

/* Điều chỉ có tiêu đề + 1 Khoản, cùng một trạng thái */
const simpleArticle = (
  n: number,
  title: string,
  status: UnitStatus
): ReviewArticle => ({
  id: `d${n}`,
  number: n,
  title,
  units: [
    { id: `d${n}-t`, label: `Điều ${n} · Tiêu đề`, text: `Điều ${n}. ${title}`, status, heading: true },
    { id: `d${n}-k1`, label: 'Khoản 1', text: `[Nội dung Khoản 1 Điều ${n}]`, status },
  ],
})

/** Khóa theo documentId */
export const mockReviews: Record<string, DocumentReview> = {
  'doc-78-2014': {
    documentId: 'doc-78-2014',
    title: 'Hướng dẫn thi hành Luật Thuế thu nhập doanh nghiệp',
    sourceUrl: 'https://vbpl.vn',
    meta: {
      number: '78/2014/TT-BTC',
      docType: 'Thông tư',
      issuer: 'Bộ Tài chính',
      issuedAt: '2014-06-18',
      effectiveAt: '2014-08-02',
    },
    chapters: [
      {
        title: 'Chương I · Quy định chung',
        articles: [
          simpleArticle(1, 'Người nộp thuế', 'REVIEWED'),
          simpleArticle(2, 'Thu nhập chịu thuế', 'REVIEWED'),
          simpleArticle(3, 'Các khoản thu nhập được miễn thuế', 'REVIEWED'),
        ],
      },
      {
        title: 'Chương II · Căn cứ và phương pháp tính thuế',
        articles: [
          simpleArticle(4, 'Thu nhập tính thuế', 'REVIEWED'),
          simpleArticle(5, 'Doanh thu', 'AUTO'),
          {
            id: 'd6',
            number: 6,
            title: 'Các khoản chi được trừ và không được trừ khi xác định thu nhập chịu thuế',
            units: [
              { id: 'd6-t', label: 'Điều 6 · Tiêu đề', text: 'Điều 6. Các khoản chi được trừ và không được trừ khi xác định thu nhập chịu thuế', status: 'REVIEWED', heading: true },
              { id: 'd6-k1', label: 'Khoản 1', text: 'Trừ các khoản chi không được trừ nêu tại Khoản 2 Điều này, doanh nghiệp được trừ mọi khoản chi nếu đáp ứng đủ các điều kiện sau:', status: 'REVIEWED' },
              { id: 'd6-k1a', label: 'Khoản 1 · Điểm a', text: 'Khoản chi thực tế phát sinh liên quan đến hoạt động sản xuất, kinh doanh của doanh nghiệp.', status: 'AUTO' },
              { id: 'd6-k1b', label: 'Khoản 1 · Điểm b', text: 'Khoản chi có đủ hóa đơn, chứng từ hợp pháp theo quy định của pháp luật.', status: 'AUTO' },
              { id: 'd6-k1c', label: 'Khoản 1 · Điểm c', text: 'Khoản chi nếu có hóa đơn mua hàng hóa, dịch vụ từng lần có giá trị từ 20 triệu đồng trở lên phải có chứng từ thanh toán không dùng tiền mặt.', status: 'WARNING', warning: 'Số tiền "20 triệu đồng" cần đối chiếu bản gốc: bản quét bị mờ ở dòng này.' },
              { id: 'd6-k2', label: 'Khoản 2', text: 'Các khoản chi không được trừ khi xác định thu nhập chịu thuế bao gồm: [nội dung Khoản 2]', status: 'AUTO' },
            ],
          },
          simpleArticle(7, 'Thu nhập khác', 'AUTO'),
        ],
      },
      {
        title: 'Chương III · Ưu đãi thuế',
        articles: [
          {
            ...simpleArticle(18, 'Điều kiện áp dụng ưu đãi', 'AUTO'),
            units: [
              { id: 'd18-t', label: 'Điều 18 · Tiêu đề', text: 'Điều 18. Điều kiện áp dụng ưu đãi', status: 'AUTO', heading: true },
              { id: 'd18-k1', label: 'Khoản 1', text: '[Nội dung Khoản 1 Điều 18]', status: 'WARNING', warning: 'Có thể thiếu Điểm c): bản gốc liệt kê a) đến d), bản bóc tách chỉ có a), b), d).' },
            ],
          },
          simpleArticle(19, 'Thuế suất ưu đãi', 'AUTO'),
        ],
      },
    ],
  },
}

const after = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

/** Chi tiết văn bản: VBHN có dữ liệu đầy đủ; văn bản khác dựng tối thiểu từ mockDocuments */
export function getMockDetail(id: string): DocumentDetail | null {
  const doc = mockDocuments.find((d) => d.id === id)
  if (!doc) return null
  const collected = doc.queuedAt
  // Số bước đã xong theo stage hiện tại (Thu thập, Kiểm tra phiên bản, Bóc tách, Rà soát, Index)
  const done = { parse: 2, review: 3, index: 4, indexed: 5 }[doc.stage]
  const base: DocumentDetail = {
    id,
    number: doc.number,
    title: doc.title,
    docType: doc.docType,
    issuer: 'Bộ Tài chính',
    currentVersion: doc.version?.no ?? 1,
    timeline: [0, 1, 2, 3, 4].map((i) => (i < done ? after(collected, i * 3) : null)),
    rag: null,
    versions: [
      {
        no: doc.version?.no ?? 1,
        collectedAt: collected,
        source: doc.source,
        reviewer: null,
        reviewedAt: null,
        status: { parse: 'PENDING', review: 'PENDING', index: 'APPROVED', indexed: 'INDEXED' }[doc.stage] as DocumentDetail['versions'][number]['status'],
      },
    ],
    chunks: [],
    chapters: [],
    history: [{ at: collected, actor: 'Hệ thống', text: 'Thu thập văn bản' }],
  }
  if (id !== 'doc-vbhn-tndn') return base

  const approvedAt = after(collected, 2 * 1440 + 425)
  const indexedAt = after(approvedAt, 7)
  return {
    ...base,
    title: 'Văn bản hợp nhất Thông tư hướng dẫn thuế TNDN',
    docType: 'Văn bản hợp nhất',
    timeline: [collected, after(collected, 2), after(collected, 5), approvedAt, indexedAt],
    rag: {
      approvedBy: 'Lê Thu Hà',
      approvedAt,
      chunkCount: 312,
      vectorCount: 312,
      indexedAt,
    },
    versions: [
      { no: 3, collectedAt: collected, source: 'CRAWL', reviewer: 'Lê Thu Hà', reviewedAt: approvedAt, status: 'INDEXED' },
      { no: 2, collectedAt: daysAgo(66), source: 'CRAWL', reviewer: 'Lê Thu Hà', reviewedAt: daysAgo(64), status: 'SUPERSEDED' },
      { no: 1, collectedAt: daysAgo(207), source: 'UPLOAD', reviewer: 'Lê Thu Hà', reviewedAt: daysAgo(206), status: 'SUPERSEDED' },
    ],
    chunks: [
      { id: 'c-0601', path: 'Điều 6 · Tiêu đề', text: 'Điều 6. Các khoản chi được trừ và không được trừ khi xác định thu nhập chịu thuế' },
      { id: 'c-0602', path: 'Điều 6 · Khoản 1', text: 'Trừ các khoản chi không được trừ nêu tại Khoản 2 Điều này, doanh nghiệp được trừ mọi khoản chi nếu đáp ứng đủ các điều kiện sau:' },
      { id: 'c-0625', path: 'Điều 6 · Khoản 2 · Điểm 2.5', text: '[nội dung điểm 2.5 đã sửa đổi]' },
      { id: 'c-0626', path: 'Điều 6 · Khoản 2 · Điểm 2.6', text: '[nội dung không đổi]' },
    ],
    chapters: [
      {
        title: 'Chương II · Căn cứ và phương pháp tính thuế',
        articles: [
          simpleArticle(4, 'Thu nhập tính thuế', 'REVIEWED'),
          simpleArticle(6, 'Các khoản chi được trừ và không được trừ', 'REVIEWED'),
          simpleArticle(9, 'Xác định chi phí khấu hao tài sản cố định', 'REVIEWED'),
        ],
      },
    ],
    history: [
      { at: indexedAt, actor: 'Hệ thống', text: 'Index 312 đoạn vào Qdrant Shared KB; v2 chuyển sang Đã thay thế' },
      { at: approvedAt, actor: 'Lê Thu Hà', text: 'Duyệt v3 sau khi đối chiếu 5/5 mục' },
      { at: after(collected, 5), actor: 'Hệ thống', text: 'Bóc tách v3: 42 Điều' },
      { at: after(collected, 2), actor: 'Hệ thống', text: 'Kiểm tra phiên bản: 4 Điều sửa, 1 Điều thêm' },
      { at: collected, actor: 'Hệ thống', text: 'Thu thập tự động v3 từ vbpl.vn' },
    ],
  }
}

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

