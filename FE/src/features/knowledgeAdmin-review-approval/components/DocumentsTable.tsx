import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DOCUMENT_STATUS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { PIPELINE, SOURCE_LABEL } from '../constants'
import type { KnowledgeDocument } from '../types'
import { useMotion } from '@/components/ui/motion'

/** Mặc định: Chờ duyệt → so sánh phiên bản / rà soát nội dung; bước khác → chi tiết */
const queueLink = (d: KnowledgeDocument) =>
  d.stage === 'review'
    ? `/knowledge/documents/${d.id}/${d.version?.changed ? 'compare' : 'review'}`
    : `/knowledge/documents/${d.id}`

interface DocumentsTableProps {
  rows: KnowledgeDocument[]
  /** Chữ khi không có dòng nào, vd. đang tải hoặc lỗi */
  empty?: string
  /** Đang tải lần đầu: hiện dòng khung xương đúng số cột thay cho chữ */
  loading?: boolean
  /** Link khi bấm số hiệu */
  linkTo?: (d: KnowledgeDocument) => string
  /** Có thì bấm số hiệu gọi hàm này (vd. mở ngăn kéo) thay vì chuyển trang */
  onOpen?: (d: KnowledgeDocument) => void
  /** Thêm cột trạng thái: bước quy trình hoặc badge lỗi */
  showStage?: boolean
}

const linkCls = 'text-accent-text underline underline-offset-4'

export function DocumentsTable({
  rows,
  empty = 'Không có văn bản nào.',
  loading = false,
  linkTo = queueLink,
  onOpen,
  showStage = false,
}: DocumentsTableProps) {
  const motion = useMotion<HTMLTableSectionElement>({
    preset: 'fade',
    replayKey: rows.map((row) => row.id).join(','),
  })
  return (
    <section className="paper mt-4 overflow-x-auto">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>Sắp theo thời gian vào hàng đợi, cũ nhất trước</span>
        <span>
          <span className="num">{rows.length}</span> văn bản
        </span>
      </div>
      <table className="w-full min-w-200 text-sm">
        <thead className="bg-sunken text-fg-muted">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <th className="text-left">Số hiệu</th>
            <th className="text-left">Văn bản</th>
            {showStage && <th className="text-left">Trạng thái</th>}
            <th className="text-left">Phiên bản</th>
            <th className="text-left">Cảnh báo bóc tách</th>
            <th className="text-right">Ngày hiệu lực</th>
            <th className="text-right">Vào hàng đợi</th>
            <th>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody ref={motion}>
          {rows.map((d) => (
            <tr
              key={d.id}
              className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
            >
              <td className="num whitespace-nowrap">
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(d)}
                    className={linkCls}
                  >
                    {d.number}
                  </button>
                ) : (
                  <Link to={linkTo(d)} className={linkCls}>
                    {d.number}
                  </Link>
                )}
              </td>
              <td>
                <div className="text-fg-strong font-semibold">{d.title}</div>
                <div className="text-fg-muted">
                  {d.docType} · {SOURCE_LABEL[d.source]}
                </div>
              </td>
              {showStage && (
                <td className="whitespace-nowrap">
                  {d.failure ? (
                    <StatusBadge status={DOCUMENT_STATUS[d.failure.kind]} />
                  ) : (
                    PIPELINE.find((p) => p.key === d.stage)?.label
                  )}
                </td>
              )}
              <td>
                {d.version ? (
                  <span className="text-fg-strong font-semibold">
                    <span className="num">v{d.version.no}</span>
                    {d.version.changed && ' · có thay đổi'}
                  </span>
                ) : (
                  <span className="text-fg-muted">Mới</span>
                )}
              </td>
              <td>
                {d.parseWarnings > 0 ? (
                  <span className="text-warning inline-flex items-center gap-1.5">
                    <TriangleAlert size={14} aria-hidden="true" />
                    <span className="num">{d.parseWarnings}</span> mục cần kiểm
                    tra
                  </span>
                ) : (
                  <span className="text-fg-muted">Không có</span>
                )}
              </td>
              <td className="num text-right">
                {d.effectiveAt ? formatDate(d.effectiveAt) : '—'}
              </td>
              <td className="num text-right">{formatDate(d.queuedAt)}</td>
              <td className="text-right whitespace-nowrap">
                {/* Nút rõ ràng thay cho việc phải biết bấm vào số hiệu; văn bản chờ duyệt dùng nút chính */}
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(d)}
                    className="btn btn-press btn-secondary"
                  >
                    Xem chi tiết
                  </button>
                ) : (
                  <Link
                    to={linkTo(d)}
                    className={`btn btn-press no-underline ${linkTo === queueLink && d.stage === 'review' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {linkTo === queueLink && d.stage === 'review'
                      ? d.version?.changed
                        ? 'So sánh và duyệt'
                        : 'Rà soát và duyệt'
                      : 'Xem chi tiết'}
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {loading &&
            rows.length === 0 &&
            [0, 1, 2, 3].map((i) => (
              <tr
                key={i}
                aria-hidden="true"
                className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-4"
              >
                {Array.from({ length: showStage ? 8 : 7 }, (_, c) => (
                  <td key={c}>
                    <span
                      className="bg-sunken block h-3 rounded motion-safe:animate-pulse"
                      // Ô "Văn bản" dài hơn các ô khác, giống dữ liệu thật
                      style={{ width: c === 1 ? '80%' : '55%' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          {loading && rows.length === 0 && (
            <tr className="sr-only">
              <td role="status">Đang tải văn bản…</td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td
                colSpan={showStage ? 8 : 7}
                className="text-fg-muted px-4 py-10 text-center"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
