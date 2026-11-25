import { Link, useParams } from 'react-router-dom'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { AmendmentTree } from '../../features/legal-sources/components/AmendmentTree'
import { useSourceTree } from '../../features/legal-sources/hooks/useLegalSources'
import type { AmendmentNode } from '../../features/legal-sources/types'

function findNode(node: AmendmentNode, id: string): AmendmentNode | undefined {
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
}

/* One legal source in its amendment family: the original at the top, the sources changing it below */
export default function KnowledgeLegalSourcePage() {
  const { id = '' } = useParams()
  const nav = useKnowledgeNav()
  const tree = useSourceTree(id)
  const current = tree.data ? findNode(tree.data, id) : undefined

  return (
    <KnowledgeLayout
      {...nav}
      section="legalSources"
      title={current?.documentNumber}
      breadcrumb={
        <>
          <Link
            to="/knowledge/legal-sources"
            className="text-fg-muted hover:text-fg-strong"
          >
            Tra cứu văn bản
          </Link>
          {current && (
            <>
              {' '}
              <span aria-hidden="true">/</span>{' '}
              <span className="text-fg-strong num" aria-current="page">
                {current.documentNumber}
              </span>
            </>
          )}
        </>
      }
    >
      {tree.data ? (
        <>
          <h1 className="text-h1 num">{current?.documentNumber}</h1>
          <p className="text-fg-strong mt-2 max-w-[65ch]">{current?.title}</p>
          <section className="paper mt-8 p-5" aria-labelledby="amendment-tree">
            <h2 id="amendment-tree" className="text-h2">
              Cây sửa đổi
            </h2>
            <ul className="mt-4 space-y-1">
              <AmendmentTree node={tree.data} currentId={id} />
            </ul>
          </section>
        </>
      ) : (
        <h1 className="text-h1-tool">
          {tree.isLoading
            ? 'Đang tải…'
            : (tree.error?.message ?? 'Không tìm thấy văn bản')}
        </h1>
      )}
    </KnowledgeLayout>
  )
}
