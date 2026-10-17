/** Số liệu một tháng của kho tri thức */
export interface KnowledgeStatPeriod {
  /** Ngày đầu tháng, dạng YYYY-MM-DD */
  start: string
  /** Tháng đang diễn ra (chưa chốt): không dùng để so sánh tăng/giảm */
  partial?: boolean
  /** Văn bản thu thập theo nguồn */
  crawled: number
  uploaded: number
  /** Văn bản được duyệt và index vào kho */
  newDocs: number
  newVersions: number
}

export interface KnowledgeStats {
  /** 12 tháng gần nhất, cũ nhất trước */
  months: KnowledgeStatPeriod[]
  /** Cơ cấu kho theo loại văn bản */
  byDocType: { docType: string; count: number }[]
}
