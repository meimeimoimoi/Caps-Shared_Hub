import type { ReactNode } from 'react'

/* SHFT §9 · Lề ghi chú */
export type MarginNoteKind = 'cite' | 'ai' | 'edit'

export interface MarginNoteProps {
  kind: MarginNoteKind
  label: string // vd. "[1] Căn cứ", "AI · Cần xem lại" (mnote-label tự in hoa)
  children: ReactNode
  action?: { label: string; onClick: () => void }
}

const kindClass: Record<MarginNoteKind, string> = {
  cite: 'mnote-cite',
  ai: 'mnote-ai',
  edit: 'mnote-edit',
}

export function MarginNote({ kind, label, children, action }: MarginNoteProps) {
  return (
    <div className={`mnote ${kindClass[kind]}`}>
      <span
        className={
          kind === 'cite'
            ? 'mnote-label text-accent-text'
            : 'mnote-label text-fg-strong'
        }
      >
        {label}
      </span>
      <span className="text-fg">{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-fg-strong self-start underline underline-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
