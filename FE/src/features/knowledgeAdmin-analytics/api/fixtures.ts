/* MOCK: sample figures for the Knowledge Admin dashboard, only when VITE_KNOWLEDGE_DATA_SOURCE=mock.
 * Shaped like GET /api/v1/knowledge/stats; none of these numbers are real. */
import type { KnowledgeStats } from '../types'

const CRAWLED = [8, 10, 7, 12, 9, 11, 14, 10, 13, 12, 15, 9]
const UPLOADED = [3, 2, 4, 2, 5, 3, 2, 4, 3, 5, 4, 3]
const NEW_DOCS = [6, 7, 5, 8, 7, 8, 9, 7, 10, 9, 11, 4]
const NEW_VERSIONS = [2, 3, 2, 3, 2, 3, 4, 3, 2, 4, 3, 1]

export function mockKnowledgeStats(now = new Date()): KnowledgeStats {
  const months = CRAWLED.map((crawled, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (CRAWLED.length - 1 - i), 1)
    return {
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      partial: i === CRAWLED.length - 1,
      crawled,
      uploaded: UPLOADED[i],
      newDocuments: NEW_DOCS[i],
      newVersions: NEW_VERSIONS[i],
    }
  })
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  return {
    pipeline: {
      awaitingContent: 2,
      awaitingReview: 7,
      approved: 1,
      indexed: 126,
      rejected: 5,
      parseFailed: 1,
      indexFailed: 1,
    },
    months,
    byDocType: [
      { docType: 'Thông tư', count: 54 },
      { docType: 'Nghị định', count: 31 },
      { docType: 'VB hợp nhất', count: 20 },
      { docType: 'Quyết định', count: 12 },
      { docType: 'Luật', count: 9 },
    ],
    pendingAges: [
      { days: 0, count: 2 },
      { days: 2, count: 2 },
      { days: 4, count: 2 },
      { days: 9, count: 1 },
    ],
    recentRuns: [
      { id: 'run-3', triggerType: 'MANUAL', status: 'SUCCEEDED', startedAt: daysAgo(1), finishedAt: daysAgo(1), documentsFound: 9, newDocuments: 3, newVersions: 1 },
      { id: 'run-2', triggerType: 'MANUAL', status: 'FAILED', startedAt: daysAgo(8), finishedAt: daysAgo(8), documentsFound: 0, newDocuments: 0, newVersions: 0 },
      { id: 'run-1', triggerType: 'MANUAL', status: 'SUCCEEDED', startedAt: daysAgo(15), finishedAt: daysAgo(15), documentsFound: 12, newDocuments: 5, newVersions: 2 },
    ],
  }
}
