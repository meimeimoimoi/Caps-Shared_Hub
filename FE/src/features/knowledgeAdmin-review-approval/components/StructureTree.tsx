import { Check, CircleDashed, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNIT_STATUS } from '../constants'
import type { DocumentReview, UnitStatus } from '../types'
import { articleStatus } from '../utils/review'

const ICON = {
  REVIEWED: <Check size={14} aria-hidden="true" className="text-fg-muted" />,
  AUTO: <CircleDashed size={14} aria-hidden="true" className="text-fg-muted" />,
  WARNING: <TriangleAlert size={14} aria-hidden="true" className="text-warning" />,
} satisfies Record<UnitStatus, unknown>

interface StructureTreeProps {
  chapters: DocumentReview['chapters']
  selectedId?: string
  onSelect: (articleId: string) => void
}

/* Cây Chương → Điều đã bóc tách, kèm trạng thái rà soát từng Điều */
export function StructureTree({ chapters, selectedId, onSelect }: StructureTreeProps) {
  return (
    <nav aria-label="Cấu trúc bóc tách" className="text-sm">
      <h2 className="text-fg-strong font-semibold">Cấu trúc bóc tách</h2>
      {chapters.map((ch) => (
        <div key={ch.title} className="mt-4">
          <p className="text-fg-muted text-caption font-semibold">{ch.title}</p>
          <ul className="mt-1 space-y-0.5">
            {ch.articles.map((a) => {
              const status = articleStatus(a)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-current={a.id === selectedId ? 'true' : undefined}
                    onClick={() => onSelect(a.id)}
                    className={cn(
                      'rounded-control flex w-full items-start gap-2 px-2 py-1 text-left',
                      a.id === selectedId
                        ? 'bg-accent-soft text-fg-strong font-semibold'
                        : 'hover:bg-desk-2'
                    )}
                  >
                    <span className="mt-0.5 shrink-0" title={UNIT_STATUS[status].legend}>
                      {ICON[status]}
                    </span>
                    <span>
                      Điều {a.number}. {a.title}
                      {/* Icon là aria-hidden nên đọc trạng thái bằng chữ */}
                      <span className="sr-only">, {UNIT_STATUS[status].legend}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <ul className="text-fg-muted text-caption border-border-subtle mt-5 space-y-1 border-t pt-3">
        {(Object.keys(UNIT_STATUS) as UnitStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            {ICON[s]}
            {UNIT_STATUS[s].legend}
          </li>
        ))}
      </ul>
    </nav>
  )
}
