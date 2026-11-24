/** The other source of one amendment link (AmendmentLinkResponse) */
export interface AmendmentLink {
  id: string
  documentNumber: string
  /** AMENDS (sửa đổi, bổ sung) or REPLACES (thay thế) */
  relationType: string
}

/** A legal source in the catalog (LegalSourceResponse) */
export interface LegalSource {
  id: string
  documentNumber: string
  docType: string
  issuingAuthority: string | null
  title: string
  /** Validity of the newest approved version; null while none is approved */
  latestEffectiveFrom: string | null
  latestEffectiveTo: string | null
  amends: AmendmentLink[]
  amendedBy: AmendmentLink[]
}

export interface LegalSourcePage {
  items: LegalSource[]
  page: number
  pageSize: number
  total: number
}

/** A node of the amendment family tree (AmendmentTreeNodeResponse); its children amend it */
export interface AmendmentNode {
  id: string
  documentNumber: string
  title: string
  docType: string
  /** How this source changes its parent; null for the root */
  relationType: string | null
  affectedArticles: unknown
  children: AmendmentNode[]
}

export interface LegalSourceFilter {
  q: string
  docType: string
  /** Starts at 1 */
  page: number
}
