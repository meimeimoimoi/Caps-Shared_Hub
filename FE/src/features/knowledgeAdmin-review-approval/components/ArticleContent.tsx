import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNIT_STATUS } from '../constants'
import type { ReviewArticle } from '../types'

interface ArticleContentProps {
  article: ReviewArticle
  /** Đang sửa đoạn: mỗi đơn vị thành textarea */
  editing?: boolean
  edits?: Record<string, string>
  onEdit?: (unitId: string, text: string) => void
  /** Bỏ trống = chỉ đọc, không hiện nút đánh dấu */
  onMarkReviewed?: (unitId: string) => void
}

/* Nội dung một Điều: tiêu đề, Khoản, Điểm kèm trạng thái rà soát */
export function ArticleContent({
  article,
  editing = false,
  edits = {},
  onEdit,
  onMarkReviewed,
}: ArticleContentProps) {
  return (
    <div className="space-y-5">
      {article.units.map((u) => (
        <div
          key={u.id}
          className={cn(
            u.status === 'AUTO' && 'para-ai',
            u.status === 'WARNING' && 'para-check'
          )}
        >
          <p className="text-caption">
            <span className="text-fg-strong font-semibold">{u.label}</span>
            <span className="text-fg-muted"> · {UNIT_STATUS[u.status].short}</span>
          </p>
          {editing ? (
            <textarea
              aria-label={`Nội dung ${u.label}`}
              rows={u.heading ? 2 : 3}
              value={edits[u.id] ?? u.text}
              onChange={(e) => onEdit?.(u.id, e.target.value)}
              className="border-border-control rounded-control shadow-control bg-paper mt-1 w-full resize-y border px-3 py-2 text-base"
            />
          ) : (
            <p
              className={cn(
                'mt-1',
                u.heading ? 'text-fg-strong text-lg font-semibold' : 'text-base'
              )}
            >
              {u.text}
            </p>
          )}
          {u.warning && (
            <p className="text-warning mt-2 flex gap-1.5 text-sm">
              <TriangleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              {u.warning}
            </p>
          )}
          {!editing && onMarkReviewed && u.status !== 'REVIEWED' && (
            <button
              type="button"
              onClick={() => onMarkReviewed(u.id)}
              className="text-fg-strong mt-2 text-sm underline underline-offset-4"
            >
              {u.status === 'WARNING'
                ? 'Đã kiểm tra, khớp bản gốc'
                : 'Đánh dấu đã rà soát'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
