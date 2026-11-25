import { api } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type {
  AmendmentNode,
  LegalSourceFilter,
  LegalSourcePage,
} from '../types'

const fixtures = () => import('./fixtures')
const BASE = '/api/v1/knowledge/sources'
export const PAGE_SIZE = 20

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/** Sources whose number or title contains q (any case), optionally of one document type */
export async function listLegalSources(
  filter: LegalSourceFilter,
  signal?: AbortSignal
): Promise<LegalSourcePage> {
  if (isKnowledgeDemo) return (await fixtures()).demoPage(filter)
  const res = await api.get<Envelope<LegalSourcePage>>(BASE, {
    params: {
      q: filter.q.trim() || undefined,
      docType: filter.docType || undefined,
      page: filter.page,
      pageSize: PAGE_SIZE,
    },
    signal,
  })
  return res.data
}

/** The family tree from the original source down to every source amending it */
export async function getSourceTree(
  id: string,
  signal?: AbortSignal
): Promise<AmendmentNode> {
  if (isKnowledgeDemo) return (await fixtures()).demoTree(id)
  const res = await api.get<Envelope<AmendmentNode>>(
    `${BASE}/${encodeURIComponent(id)}/tree`,
    { signal }
  )
  return res.data
}
