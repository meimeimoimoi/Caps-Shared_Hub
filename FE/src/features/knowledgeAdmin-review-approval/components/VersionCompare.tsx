import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DOCUMENT_STATUS, type StatusMeta } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/status-badge'
import { CHANGE_LABEL } from '../constants'
import type { ArticleChange, Clause } from '../types'

interface VersionCompareProps {
  changes: ArticleChange[]
  prevVersion: number
  version: number
}

function ClauseLine({ c }: { c: Clause }) {
  if (c.change === 'removed')
    return (
      <p>
        <span className="text-danger text-caption mr-2 font-semibold">Bỏ</span>
        <del className="text-fg-muted">{c.text}</del>
      </p>
    )
  if (c.change === 'added')
    return (
      <p className="border-ink border-l-2 pl-2">
        <span className="text-caption mr-2 font-semibold">Thêm</span>
        <ins className="text-revised">{c.text}</ins>
      </p>
    )
  return <p>{c.text}</p>
}

function VersionCard(props: {
  title: string
  status: StatusMeta
  heading: string
  clauses: Clause[] | null
  missing: string
}) {
  return (
    <section className="paper min-w-0">
      <div className="border-border-subtle flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-fg-strong text-sm font-semibold">{props.title}</h3>
        <StatusBadge status={props.status} />
      </div>
      <div className="space-y-3 p-4">
        {props.clauses ? (
          <>
            <p className="text-fg-strong font-semibold">{props.heading}</p>
            {props.clauses.map((c, i) => (
              <ClauseLine key={i} c={c} />
            ))}
          </>
        ) : (
          <p className="text-fg-muted">{props.missing}</p>
        )}
      </div>
    </section>
  )
}

/* Danh sách Điều có thay đổi bên trái; bấm một Điều để so 2 phiên bản cạnh nhau */
export function VersionCompare({
  changes,
  prevVersion,
  version,
}: VersionCompareProps) {
  const [article, setArticle] = useState(changes[0]?.article)
  const current = changes.find((c) => c.article === article)

  const list: ReactNode = (
    <nav aria-label="Điều có thay đổi">
      <p className="text-fg-muted text-caption mb-2 font-semibold">
        Điều có thay đổi
      </p>
      <ul className="space-y-1">
        {changes.map((c) => (
          <li key={c.article}>
            <button
              type="button"
              aria-current={c.article === article ? 'true' : undefined}
              onClick={() => setArticle(c.article)}
              className={cn(
                'rounded-control flex w-full items-center justify-between px-2 py-1.5 text-left text-sm',
                c.article === article
                  ? 'bg-accent-soft text-fg-strong font-semibold'
                  : 'hover:bg-desk-2'
              )}
            >
              Điều {c.article}
              <span className="text-fg-muted text-caption font-normal">
                {CHANGE_LABEL[c.kind]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div className="grid items-start gap-4 md:grid-cols-[140px_1fr] md:gap-6">
      {list}
      {current && (
        <div className="grid gap-4 lg:grid-cols-2">
          <VersionCard
            title={`v${prevVersion} · đang dùng`}
            status={DOCUMENT_STATUS.INDEXED}
            heading={current.heading}
            clauses={current.before}
            missing={`Điều này chưa có ở v${prevVersion}.`}
          />
          <VersionCard
            title={`v${version} · bản mới thu thập`}
            status={DOCUMENT_STATUS.PENDING}
            heading={current.heading}
            clauses={current.after}
            missing={`Điều này đã bỏ ở v${version}.`}
          />
        </div>
      )}
    </div>
  )
}
