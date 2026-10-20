/* MOCK: số liệu minh họa 12 tháng cho dashboard Knowledge Admin.
 * TODO(api): thay bằng API thống kê của BE. Khớp với mockSummary: thu thập tháng này 12, cơ cấu theo loại cộng lại 126 = đã index. */
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
      newDocs: NEW_DOCS[i],
      newVersions: NEW_VERSIONS[i],
    }
  })
  return {
    months,
    byDocType: [
      { docType: 'Thông tư', count: 54 },
      { docType: 'Nghị định', count: 31 },
      { docType: 'VB hợp nhất', count: 20 },
      { docType: 'Quyết định', count: 12 },
      { docType: 'Luật', count: 9 },
    ],
  }
}
