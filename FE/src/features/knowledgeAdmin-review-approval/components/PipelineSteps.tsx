import {
  BadgeCheck,
  ChevronRight,
  Database,
  Inbox,
  ListChecks,
  ScanLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PIPELINE, type PipelineStage, type QueueFilter } from '../constants'
import type { PipelineSummary } from '../types'

const ICON: Record<PipelineStage, LucideIcon> = {
  collect: Inbox,
  parse: ScanLine,
  review: ListChecks,
  index: Database,
  indexed: BadgeCheck,
}

interface PipelineStepsProps {
  summary?: PipelineSummary
  /** 'failed' = đang xem văn bản lỗi, không bước nào được chọn */
  selected: QueueFilter
  onSelect: (stage: PipelineStage) => void
}

/** Số đếm + ghi chú của một bước; alert = chip cảnh báo (vd. index lỗi) */
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
        note: `${s.indexing} đang chạy`,
        alert: s.indexFailed ? `${s.indexFailed} lỗi` : undefined,
      }
    case 'indexed':
      return { count: s.indexed, note: 'AI/RAG đang dùng' }
  }
}

/* Dải 5 bước quy trình kho tri thức; mỗi ô là nút lọc bảng văn bản bên dưới.
 * Ô đang chọn tô màu accent (cam) của SHFT. */
export function PipelineSteps({ summary, selected, onSelect }: PipelineStepsProps) {
  return (
    <div
      role="group"
      aria-label="Lọc theo bước quy trình"
      className="paper grid grid-cols-2 gap-1.5 p-1.5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {PIPELINE.map(({ key, label }, i) => {
        const s = summary && stat(key, summary)
        const active = key === selected
        const Icon = ICON[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(key)}
            className={cn(
              'rounded-control relative flex min-h-32 flex-col items-start p-4 text-left transition-[background-color,transform] duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none',
              active ? 'bg-accent text-on-accent' : 'hover:bg-desk-2 text-fg'
            )}
          >
            <span
              className={cn(
                'flex items-center gap-2 text-sm',
                active ? 'text-on-accent/80' : 'text-fg-muted'
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </span>

            {s ? (
              <span
                className={cn(
                  'num mt-auto pt-4 text-3xl leading-none font-semibold tracking-tight',
                  !active && 'text-fg-strong'
                )}
              >
                {s.count}
              </span>
            ) : (
              // Giữ chỗ con số khi đang tải
              <span
                aria-hidden="true"
                className="bg-border-subtle mt-auto h-7 w-12 animate-pulse rounded motion-reduce:animate-none"
              />
            )}

            <span className="text-caption mt-2 flex flex-wrap items-center gap-1.5">
              <span className={active ? 'text-on-accent/80' : 'text-fg-muted'}>
                {s?.note}
              </span>
              {s?.alert && (
                <span className="bg-warning-soft text-warning inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold">
                  <TriangleAlert size={12} aria-hidden="true" />
                  {s.alert}
                </span>
              )}
            </span>

            {/* Mũi tên nối sang bước kế, chỉ khi 5 bước nằm trên một hàng */}
            {i < PIPELINE.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-paper border-border text-fg-muted absolute top-1/2 -right-3.25 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border lg:grid"
              >
                <ChevronRight size={12} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
