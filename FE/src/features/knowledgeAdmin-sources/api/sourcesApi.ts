import { api, ApiError } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type { Frequency } from '../constants'
import type {
  CollectionOverview,
  CollectionSource,
  SourceInput,
} from '../types'
import { toCollectionRun, type CrawlJobDto } from './mappers'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi. */
const fixtures = () => import('./fixtures')
const CRAWL_JOBS = '/api/v1/knowledge/crawl-jobs'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

// The two sites ingestion can crawl (TriggerCrawlHandler.KnownSources); a new one needs a crawler change
const KNOWN_SOURCES: CollectionSource[] = [
  {
    id: 'vbpl',
    name: 'Cơ sở dữ liệu quốc gia về văn bản pháp luật',
    url: 'https://vbpl.vn',
    scope: 'Thuế TNDN: Luật, Nghị định, Thông tư, Quyết định',
    status: 'ACTIVE',
  },
  {
    id: 'mof',
    name: 'Văn bản quy phạm pháp luật ngành tài chính',
    url: 'https://vbpq.mof.gov.vn',
    scope: 'Thuế TNDN',
    status: 'ACTIVE',
  },
]

export async function getCollectionOverview(
  signal?: AbortSignal
): Promise<CollectionOverview> {
  if (isKnowledgeDemo) return structuredClone((await fixtures()).mockOverview)
  const res = await api.get<Envelope<Page<CrawlJobDto>>>(CRAWL_JOBS, {
    params: { page: 1, pageSize: 20 },
    signal,
  })
  return {
    schedule: null,
    sources: KNOWN_SOURCES,
    runs: res.data.items.map(toCollectionRun),
  }
}

export async function saveSchedule(frequency: Frequency) {
  if (isKnowledgeDemo) {
    const { schedule } = (await fixtures()).mockOverview
    if (schedule) schedule.frequency = frequency
    return
  }
  throw new Error('Chức năng lịch thu thập chưa được kết nối với máy chủ.')
}

/** Chạy thu thập ngay; kết quả về sau, xem ở Lịch sử thu thập */
export async function runCollectionNow() {
  if (isKnowledgeDemo) {
    // MOCK: TODO(auth) actor lấy từ tài khoản đang đăng nhập
    ;(await fixtures()).mockOverview.runs.unshift({
      at: new Date().toISOString(),
      trigger: 'MANUAL',
      actor: 'Lê Thu Hà',
      newDocs: 0,
      newVersions: 0,
      unchanged: 12,
      errors: 0,
    })
    return
  }
  try {
    await api.post(CRAWL_JOBS, {
      sources: KNOWN_SOURCES.map((s) => s.id),
    })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'CRAWL_ALREADY_RUNNING')
      throw new ApiError(
        'Đang có một lần thu thập chạy. Chờ chạy xong rồi thử lại.',
        e.status,
        e.code
      )
    throw e
  }
}

/** Thêm nguồn (không có id) hoặc sửa nguồn có sẵn */
export async function saveSource(input: SourceInput, id?: string) {
  if (isKnowledgeDemo) {
    const sources = (await fixtures()).mockOverview.sources
    const existing = sources.find((s) => s.id === id)
    if (existing) Object.assign(existing, input)
    else sources.push({ id: `src-${Date.now().toString(36)}`, ...input })
    return
  }
  throw new Error('Chức năng sửa nguồn thu thập chưa được kết nối với máy chủ.')
}
