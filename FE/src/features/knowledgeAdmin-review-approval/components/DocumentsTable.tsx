import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SOURCE_LABEL } from '../constants'
import type { KnowledgeDocument } from '../types'

interface DocumentsTableProps {
  rows: KnowledgeDocument[]
  /** Chữ khi không có dòng nào, vd. đang tải hoặc lỗi */
  empty?: string
}

export function DocumentsTable({
  rows,
  empty = 'Không có văn bản nào.',
}: DocumentsTableProps) {
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
            <th className="text-left">Phiên bản</th>
            <th className="text-left">Cảnh báo bóc tách</th>
            <th className="text-right">Ngày hiệu lực</th>
            <th className="text-right">Vào hàng đợi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr
              key={d.id}
              className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
            >
              <td className="num whitespace-nowrap">
                {/* Phiên bản mới có thay đổi → màn so sánh; các màn rà soát khác: TODO */}
                {d.stage === 'review' && d.version?.changed ? (
                  <Link
                    to={`/knowledge/documents/${d.id}/compare`}
                    className="text-accent-text underline underline-offset-4"
                  >
                    {d.number}
                  </Link>
                ) : (
                  <span className="text-accent-text">{d.number}</span>
                )}
              </td>
              <td>
                <div className="text-fg-strong font-semibold">{d.title}</div>
                <div className="text-fg-muted">
                  {d.docType} · {SOURCE_LABEL[d.source]}
                </div>
              </td>
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
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
