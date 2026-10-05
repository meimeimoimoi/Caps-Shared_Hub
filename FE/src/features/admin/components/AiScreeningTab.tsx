import { Check, TriangleAlert } from 'lucide-react'
import { COPY } from '@/lib/constants'
import type { ApplicationDetail, LegalCheck } from '../types'
import { formatDateTime } from '../utils/applications'

const resultLabel: Record<LegalCheck['result'], string> = {
  declared: 'Đã kê khai',
  present: 'Có trong hồ sơ',
  review: 'Cần xem lại',
}

interface AiScreeningTabProps {
  screening: ApplicationDetail['screening']
  reviewedFlags: string[]
  onToggleReviewed: (flagId: string) => void
  onRequestSupplement: () => void
}

export function AiScreeningTab({
  screening,
  reviewedFlags,
  onToggleReviewed,
  onRequestSupplement,
}: AiScreeningTabProps) {
  const { ranAt, rerunAt, checkedCount, flags, legalChecks } = screening

  return (
    <section className="paper p-5 md:p-6">
      <div className="para-ai">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-h2">Kết quả AI sàng lọc</h2>
          <span className="badge-ai">AI</span>
        </div>
        <p className="text-fg-muted mt-1 text-sm">
          Chạy lúc <span className="num">{formatDateTime(ranAt)}</span>
          {rerunAt && (
            <>
              , chạy lại sau bổ sung lúc{' '}
              <span className="num">{formatDateTime(rerunAt)}</span>
            </>
          )}
          . {COPY.aiScreeningNote}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1">
          <span>
            <span className="num">{checkedCount}</span> mục đã kiểm tra
          </span>
          {flags.length > 0 && (
            <span className="text-warning inline-flex items-center gap-1.5">
              <TriangleAlert size={14} aria-hidden="true" />
              <span className="num">{flags.length}</span> mục cần xem lại
            </span>
          )}
          <span className="text-fg-muted">
            Đã xem xét{' '}
            <span className="num">
              {reviewedFlags.length}/{flags.length}
            </span>
          </span>
        </div>

        {flags.map((f) => {
          const reviewed = reviewedFlags.includes(f.id)
          return (
            <div key={f.id} className="para-check mt-4">
              <p className="text-warning flex items-center gap-2 font-semibold">
                {reviewed ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <TriangleAlert size={15} aria-hidden="true" />
                )}
                {f.title}
              </p>
              <p className="mt-1 pl-6 text-sm">{f.detail}</p>
              <div className="mt-3 flex gap-2 pl-6">
                <button
                  type="button"
                  aria-pressed={reviewed}
                  onClick={() => onToggleReviewed(f.id)}
                  className="btn btn-press btn-secondary bg-paper text-sm"
                >
                  {reviewed ? 'Bỏ đánh dấu' : 'Đánh dấu đã xem xét'}
                </button>
                <button
                  type="button"
                  onClick={onRequestSupplement}
                  className="btn btn-press btn-ghost text-sm"
                >
                  Yêu cầu bổ sung
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="text-fg-strong mt-6 font-semibold">
        Kiểm tra giấy tờ pháp lý
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th>Mục kiểm tra</th>
              <th>Kết quả AI</th>
              <th>Ghi chú AI</th>
              <th>Tài liệu</th>
            </tr>
          </thead>
          <tbody>
            {legalChecks.map((c) => (
              <tr
                key={c.item}
                className="border-border-subtle border-t align-top [&>td]:px-3 [&>td]:py-2.5"
              >
                <td>{c.item}</td>
                <td
                  className={c.result === 'review' ? 'text-warning' : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {c.result === 'review' ? (
                      <TriangleAlert size={13} aria-hidden="true" />
                    ) : (
                      <Check size={13} aria-hidden="true" />
                    )}
                    {resultLabel[c.result]}
                  </span>
                </td>
                <td>{c.note}</td>
                {/* TODO(api): mở file thật khi có URL tài liệu */}
                <td className="underline underline-offset-2">
                  {c.document ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

