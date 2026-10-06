import { useState } from 'react'
import { CircleX } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { DOCUMENT_STATUS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Drawer } from '@/components/ui/feedback/drawer'
import type { KnowledgeDocument } from '../types'

interface FailureDrawerProps {
  doc: KnowledgeDocument & { failure: NonNullable<KnowledgeDocument['failure']> }
  onClose: () => void
  /** Reject → giữ ngăn kéo, hiện lỗi */
  onRetry: () => Promise<unknown>
}

/* Ngăn kéo chi tiết lỗi index/bóc tách của một văn bản, kèm nút thử lại */
export function FailureDrawer({ doc, onClose, onRetry }: FailureDrawerProps) {
  const f = doc.failure
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  const rows: [string, string][] = [
    [
      'Tự động thử lại',
      `Lần ${f.attempts} (tối đa theo System Policy) · ${
        f.nextRetryAt ? `lần tiếp theo ${time(f.nextRetryAt)}` : 'đã dừng tự động'
      }`,
    ],
    ['Văn bản cũ', f.previousVersion ?? 'Không có; văn bản mới'],
    [
      'AI/RAG',
      f.previousVersion
        ? `Vẫn dùng ${f.previousVersion} cho tới khi bản mới index xong`
        : 'Chưa dùng văn bản này',
    ],
  ]

  return (
    <Drawer
      title={<span className="num">{doc.number}</span>}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              onRetry().catch((e: Error) => {
                setBusy(false)
                setError(e.message)
              })
            }}
            className="btn btn-press btn-primary w-full"
          >
            {busy ? 'Đang thử lại…' : 'Thử lại ngay'}
          </button>
          <p className="text-fg-muted text-caption">
            Quá ngưỡng retry: giữ trạng thái lỗi, ghi nhận và báo System Admin;
            bạn báo bộ phận kỹ thuật kiểm tra.
          </p>
        </>
      }
    >
      <StatusBadge status={DOCUMENT_STATUS[f.kind]} />
      <p className="text-fg-strong mt-2">{doc.title}</p>

      <div className="bg-danger-soft rounded-surface mt-4 p-3 text-sm">
        <p className="text-danger flex items-center gap-2 font-semibold">
          <CircleX size={16} aria-hidden="true" />
          {f.title}
        </p>
        <p className="mt-1">{f.message}</p>
        <p className="text-fg-muted num mt-1">Mã tham chiếu: {f.ref}</p>
      </div>

      <dl className="divide-border-subtle mt-4 divide-y text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg-strong">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="text-fg-strong mt-5 text-sm font-semibold">Nhật ký xử lý</h3>
      <ol className="divide-border-subtle mt-1 divide-y text-sm">
        {f.log.map((l) => (
          <li key={l.at} className="py-2.5">
            <p className="text-fg-muted num text-caption">{formatDateTime(l.at)}</p>
            <p>{l.text}</p>
          </li>
        ))}
      </ol>
    </Drawer>
  )
}
