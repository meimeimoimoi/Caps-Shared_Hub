import type { Frequency, RUN_TRIGGER, SOURCE_STATUS } from '../constants'

export interface CollectionSchedule {
  frequency: Frequency
  lastRunAt: string | null
  lastRunOk: boolean
  nextRunAt: string
}

export interface CollectionSource {
  id: string
  name: string
  /** Địa chỉ trang để thu thập; null = chưa cấu hình */
  url: string | null
  /** Phạm vi thu thập; null = chưa cấu hình */
  scope: string | null
  status: keyof typeof SOURCE_STATUS
}

export interface CollectionRun {
  /** Crawl job id; only set by the API */
  id?: string
  at: string
  trigger: keyof typeof RUN_TRIGGER
  /** Người bấm chạy (chỉ có khi chạy thủ công) */
  actor?: string
  /** Only set by the API: RUNNING and FAILED runs have no counts yet */
  status?: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  /** Current crawler step while RUNNING, the error when FAILED */
  note?: string
  newDocs: number
  /** The crawler does not split new versions from new documents, so the API leaves it out */
  newVersions?: number
  unchanged: number
  /** Số văn bản trích xuất lỗi */
  errors: number
}

/** Dữ liệu form thêm/sửa nguồn */
export type SourceInput = Omit<CollectionSource, 'id'>

/** Toàn bộ dữ liệu màn Nguồn thu thập, lấy trong 1 lần gọi */
export interface CollectionOverview {
  /** null = the server has no periodic schedule yet */
  schedule: CollectionSchedule | null
  sources: CollectionSource[]
  runs: CollectionRun[]
}
