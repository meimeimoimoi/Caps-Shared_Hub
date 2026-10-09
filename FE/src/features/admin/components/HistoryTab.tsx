import type { HistoryEntry } from '../types'
import { formatDateTime } from '../utils/applications'

export function HistoryTab({ history }: { history: HistoryEntry[] }) {
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">Lịch sử thao tác</h2>
      <ol className="divide-border-subtle mt-3 divide-y">
        {history.map((h, i) => (
          <li
            key={i}
            className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[130px_150px_1fr]"
          >
            <span className="text-fg-muted num text-sm">
              {formatDateTime(h.at)}
            </span>
            <span>
              {h.actor === 'AI' ? (
                <span className="badge-ai">AI</span>
              ) : (
                <span className="text-fg-strong font-semibold">{h.actor}</span>
              )}
            </span>
            <span className="text-fg-strong">{h.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

