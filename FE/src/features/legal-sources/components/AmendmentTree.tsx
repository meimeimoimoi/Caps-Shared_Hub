import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { RELATION_LABEL } from '../constants'
import type { AmendmentNode } from '../types'

/* Amendment family tree: the original source first, each source indented under the one it changes */
export function AmendmentTree({
  node,
  currentId,
}: {
  node: AmendmentNode
  currentId: string
}) {
  const current = node.id === currentId
  return (
    <li>
      <div
        className={cn('rounded-control px-3 py-2', current && 'bg-accent-soft')}
      >
        {node.relationType && (
          <p className="text-fg-muted text-caption">
            {RELATION_LABEL[node.relationType] ?? node.relationType}
          </p>
        )}
        <Link
          to={`/knowledge/legal-sources/${node.id}`}
          aria-current={current ? 'page' : undefined}
          className="text-fg-strong num font-semibold underline-offset-4 hover:underline"
        >
          {node.documentNumber}
        </Link>
        <span className="text-fg-muted"> · {node.docType}</span>
        <p className="text-fg text-sm">{node.title}</p>
      </div>
      {node.children.length > 0 && (
        <ul className="border-border-subtle ml-4 border-l pl-3">
          {node.children.map((child) => (
            <AmendmentTree key={child.id} node={child} currentId={currentId} />
          ))}
        </ul>
      )}
    </li>
  )
}
