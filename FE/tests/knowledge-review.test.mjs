import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toDocumentDetail,
  toDocumentReview,
  toKnowledgeDocument,
  toPipelineSummary,
} from '../src/features/knowledgeAdmin-review-approval/api/mappers.ts'

const summary = (over) => ({
  id: 'doc-1',
  legalSourceId: 'src-1',
  documentNumber: '80/2021/TT-BTC',
  docType: 'Thông tư',
  title: 'Hướng dẫn Luật Quản lý thuế',
  versionNo: 1,
  source: 'MANUAL_UPLOAD',
  status: 'PENDING',
  issuedDate: '2021-09-29',
  effectiveFrom: '2022-01-01',
  hasContent: true,
  lastError: null,
  createdAt: '2026-11-06T02:00:00Z',
  ...over,
})

const preview = (over) => ({
  id: 'doc-1',
  documentNumber: '80/2021/TT-BTC',
  docType: 'Thông tư',
  issuingAuthority: 'Bộ Tài chính',
  title: 'Hướng dẫn Luật Quản lý thuế',
  versionNo: 2,
  source: 'CRAWL_VBPL',
  status: 'PENDING',
  issuedDate: '2021-09-29',
  effectiveFrom: '2022-01-01',
  approvedBy: null,
  approvedAt: null,
  rejectionReason: null,
  lastError: null,
  createdAt: '2026-11-06T02:00:00Z',
  fileUrl: null,
  sourceUrl: 'https://vbpl.vn/doc/1',
  contentJson: {
    chapters: [
      {
        number: 'I',
        title: 'Quy định chung',
        articles: [
          {
            number: '1',
            title: 'Phạm vi điều chỉnh',
            units: [
              {
                id: 'd1-0',
                label: 'Mở đầu',
                text: 'Thông tư này...',
                status: 'AUTO',
              },
              {
                id: 'd1-1',
                label: 'Khoản 1',
                text: '...',
                status: 'WARNING',
                warning: 'Thiếu dấu',
              },
            ],
          },
        ],
      },
      { number: null, title: '', articles: [] },
    ],
  },
  ...over,
})

test('a split upload waits for review; a file still parsing or failed is not reviewable', () => {
  assert.equal(toKnowledgeDocument(summary()).stage, 'review')
  assert.equal(toKnowledgeDocument(summary()).source, 'UPLOAD')
  const parsing = toKnowledgeDocument(summary({ hasContent: false }))
  assert.equal(parsing.stage, 'parse')
  assert.equal(parsing.failure, undefined)
  const failed = toKnowledgeDocument(
    summary({ hasContent: false, lastError: 'Scan unreadable' })
  )
  assert.equal(failed.failure?.kind, 'PARSE_FAILED')
  assert.equal(failed.failure?.message, 'Scan unreadable')
})

test('a second version is flagged as a new version', () => {
  assert.deepEqual(toKnowledgeDocument(summary({ versionNo: 3 })).version, {
    no: 3,
    changed: true,
  })
  assert.equal(toKnowledgeDocument(summary()).version, null)
})

test('the pipeline counts come from the pending queue', () => {
  const docs = [
    summary(),
    summary({ id: '2', hasContent: false }),
    summary({ id: '3', hasContent: false, lastError: 'x' }),
  ].map(toKnowledgeDocument)
  const s = toPipelineSummary(docs)
  assert.equal(s.pending, 1)
  assert.equal(s.parsing, 1)
  assert.equal(s.parseFailed, 1)
})

test('parsed content becomes chapters, articles and units for review', () => {
  const review = toDocumentReview(preview())
  assert.equal(review.sourceUrl, 'https://vbpl.vn/doc/1')
  assert.equal(review.meta.issuer, 'Bộ Tài chính')
  assert.equal(review.chapters[0].title, 'Chương I · Quy định chung')
  assert.equal(review.chapters[1].title, 'Không thuộc chương nào')
  const article = review.chapters[0].articles[0]
  assert.equal(article.id, 'a-0-0')
  assert.equal(article.number, 1)
  assert.equal(article.units[1].status, 'WARNING')
  assert.equal(article.units[1].warning, 'Thiếu dấu')
})

test('an upload opens its stored file; no content yet means nothing to review', () => {
  const upload = preview({
    source: 'MANUAL_UPLOAD',
    fileUrl: '/api/v1/knowledge/documents/doc-1/file',
    sourceUrl: null,
  })
  assert.equal(
    toDocumentReview(upload).sourceUrl,
    '/api/v1/knowledge/documents/doc-1/file'
  )
  assert.equal(toDocumentReview(preview({ contentJson: null })), null)
})

test('the detail shows the one version with its decision', () => {
  const detail = toDocumentDetail(
    preview({
      status: 'REJECTED',
      approvedBy: 'admin-1',
      approvedAt: '2026-11-07T00:00:00Z',
      rejectionReason: 'Sai số hiệu',
    })
  )
  assert.equal(detail.versions[0].status, 'REJECTED')
  assert.equal(detail.versions[0].source, 'CRAWL')
  assert.equal(detail.history[0].text, 'Từ chối: Sai số hiệu')
  assert.equal(detail.timeline.length, 5)
})

test('a retired version shows as no longer used, with the reasons newest first', () => {
  const detail = toDocumentDetail(
    preview({
      status: 'ARCHIVED',
      metadata: {
        reprocess: { reason: 'Lỗi OCR', by: 'admin-1', at: '2026-11-01T00:00:00Z' },
        retire: { reason: 'Đã có văn bản thay thế', by: 'admin-2', at: '2026-11-20T00:00:00Z' },
      },
    })
  )
  assert.equal(detail.versions[0].status, 'RETIRED')
  assert.deepEqual(
    detail.history.map((h) => h.text),
    ['Ngừng sử dụng v2: Đã có văn bản thay thế', 'Yêu cầu bóc tách lại: Lỗi OCR']
  )
  assert.equal(detail.history[0].actor, 'admin-2')
})
