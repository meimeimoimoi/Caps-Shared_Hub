import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PIPELINE, type PipelineStage } from '../constants'
import type { PipelineSummary } from '../types'

interface PipelineStepsProps {
  summary?: PipelineSummary
  selected: PipelineStage
  onSelect: (stage: PipelineStage) => void
}

function stat(stage: PipelineStage, s: PipelineSummary) {
  switch (stage) {
    case 'collect':
      return { count: s.collectedThisMonth, note: `trong tháng ${new Date().getMonth() + 1}` }
    case 'parse':
      return { count: s.parsing, note: 'đang xử lý' }
    case 'review':
      return { count: s.pending, note: 'cần bạn rà soát' }
    case 'index':
      return {
        count: s.indexing + s.indexFailed,
        note: `${s.indexing} đang chạy${s.indexFailed ? `, ${s.indexFailed} lỗi` : ''}`,
        warn: s.indexFailed > 0,
      }
    case 'indexed':
      return { count: s.indexed, note: 'AI/RAG đang dùng' }
  }
}

/* Thanh quy trình kho tri thức; mỗi bước là nút lọc bảng văn bản bên dưới */
export function PipelineSteps({ summary, selected, onSelect }: PipelineStepsProps) {
  return (
    <div
      role="group"
      aria-label="Lọc theo bước quy trình"
      className="paper flex overflow-x-auto p-3 md:p-4"
    >
      {PIPELINE.map(({ key, label }, i) => {
        const s = summary && stat(key, summary)
        const active = key === selected
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(key)}
            className={cn(
              'rounded-control relative flex min-w-28 flex-1 flex-col items-center border-b-2 px-2 pt-2 pb-3 text-center',
              active ? 'bg-accent-soft border-accent' : 'border-transparent'
            )}
          >
            {i < PIPELINE.length - 1 && (
              <span
                aria-hidden="true"
                className="rail-track rail-track-done absolute top-2 left-1/2 w-full"
              />
            )}
            {s?.warn ? (
              <TriangleAlert
                size={16}
                aria-hidden="true"
                className="text-warning bg-paper relative"
              />
            ) : (
              <span
                aria-hidden="true"
                className={cn(
                  'rail-dot relative',
                  active ? 'rail-dot-current' : 'rail-dot-done'
                )}
              />
            )}
            <span
              className={cn(
                'mt-2 text-sm',
                active ? 'text-fg-strong font-semibold' : 'text-fg-muted'
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                'text-h2 num',
                s?.warn ? 'text-warning' : 'text-fg-strong'
              )}
            >
              {s?.count ?? '—'}
            </span>
            <span className="text-fg-muted text-caption">{s?.note}</span>
          </button>
        )
      })}
    </div>
  )
}
