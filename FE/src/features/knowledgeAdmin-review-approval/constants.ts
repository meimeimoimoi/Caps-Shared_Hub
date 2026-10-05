/* Các bước của quy trình kho tri thức; bấm một bước để lọc bảng văn bản */
export const PIPELINE = [
  { key: 'collect', label: 'Thu thập', heading: 'Văn bản đã thu thập' },
  { key: 'parse', label: 'Bóc tách', heading: 'Đang bóc tách' },
  { key: 'review', label: 'Chờ duyệt', heading: 'Chờ bạn rà soát' },
  { key: 'index', label: 'Index', heading: 'Đang index' },
  { key: 'indexed', label: 'Đã index', heading: 'Đã index' },
] as const
export type PipelineStage = (typeof PIPELINE)[number]['key']

export const SOURCE_LABEL = { UPLOAD: 'Tải lên', CRAWL: 'Crawl' } as const

export const DOC_TYPES = [
  'Luật',
  'Nghị định',
  'Thông tư',
  'Quyết định',
  'VB hợp nhất',
] as const
