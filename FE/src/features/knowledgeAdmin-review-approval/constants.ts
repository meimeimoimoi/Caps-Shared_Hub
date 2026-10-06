/* Các bước của quy trình kho tri thức; bấm một bước để lọc bảng văn bản */
export const PIPELINE = [
  { key: 'collect', label: 'Thu thập', heading: 'Văn bản đã thu thập' },
  { key: 'parse', label: 'Bóc tách', heading: 'Đang bóc tách' },
  { key: 'review', label: 'Chờ duyệt', heading: 'Chờ bạn rà soát' },
  { key: 'index', label: 'Index', heading: 'Đang index' },
  { key: 'indexed', label: 'Đã index', heading: 'Đã index' },
] as const
export type PipelineStage = (typeof PIPELINE)[number]['key']
/** Bộ lọc bảng hàng đợi: 1 bước quy trình, hoặc 'failed' = văn bản lỗi ở bất kỳ bước nào */
export type QueueFilter = PipelineStage | 'failed'

export const SOURCE_LABEL = { UPLOAD: 'Tải lên', CRAWL: 'Crawl' } as const

export const CHANGE_LABEL = {
  MODIFIED: 'Sửa',
  ADDED: 'Thêm',
  REMOVED: 'Bỏ',
} as const

/* Trạng thái từng Điều/Khoản/Điểm khi rà soát */
export const UNIT_STATUS = {
  REVIEWED: { short: 'Đã rà soát', legend: 'Đã rà soát' },
  AUTO: { short: 'Tự động', legend: 'Bóc tách tự động, chưa rà soát' },
  WARNING: { short: 'Cần kiểm tra', legend: 'Cần kiểm tra' },
} as const

/* Checklist đối chiếu với bản gốc; đủ hết mới được duyệt */
export const CROSSCHECK = {
  STRUCTURE: {
    label: 'Cấu trúc',
    hint: 'Đủ số Điều; không thiếu, trùng Khoản, Điểm; điểm a), b), c) đúng Khoản',
  },
  CONTENT: {
    label: 'Nội dung',
    hint: 'Không mất chữ, lỗi ký tự, lẫn header/footer',
  },
  FIGURES: {
    label: 'Số liệu quan trọng',
    hint: 'Thuế suất, tỷ lệ, thời hạn khớp bản gốc',
  },
  METADATA: {
    label: 'Metadata',
    hint: 'Số hiệu, loại, ngày ban hành, hiệu lực',
  },
  RELATIONS: {
    label: 'Quan hệ văn bản',
    hint: 'Văn bản gốc bị sửa đổi và các Điều bị tác động',
  },
} as const
export type CrosscheckKey = keyof typeof CROSSCHECK

/* Kết quả hệ thống kiểm tra một file vừa tải lên → nhãn + việc người dùng cần làm */
export const UPLOAD_RESULT = {
  QUEUED: {
    label: 'Đã vào hàng đợi',
    tone: 'neutral',
    todo: 'Chưa có trong kho. Bóc tách xong, chờ duyệt.',
  },
  NEW_VERSION: {
    label: 'Phiên bản mới',
    tone: 'accent',
    todo: 'Đã có số hiệu, nội dung khác. Kiểm tra lại số hiệu và ngày hiệu lực bạn đã nhập.',
  },
  DUPLICATE: {
    label: 'Trùng hoàn toàn',
    tone: 'neutral',
    todo: 'Cùng số hiệu, cùng nội dung. Hệ thống dừng, không lưu gì.',
  },
  PARSE_FAILED: {
    label: 'Lỗi bóc tách',
    tone: 'danger',
    todo: 'Không bóc tách được: bản scan mờ, sai font hoặc mất trang. Sửa file rồi tải lại.',
  },
  FILE_INVALID: {
    label: 'Lỗi file',
    tone: 'danger',
    todo: 'Sai định dạng. Chỉ nhận PDF hoặc DOCX.',
  },
} as const

export const DOC_TYPES = [
  'Luật',
  'Nghị định',
  'Thông tư',
  'Quyết định',
  'VB hợp nhất',
] as const
