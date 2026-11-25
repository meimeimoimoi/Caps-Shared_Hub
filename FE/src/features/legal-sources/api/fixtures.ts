import type {
  AmendmentNode,
  LegalSource,
  LegalSourceFilter,
  LegalSourcePage,
} from '../types'

/* MOCK: a Decree and two Circulars, the second amending the first */
const SOURCES: LegalSource[] = [
  {
    id: 'ls-218',
    documentNumber: '218/2013/NĐ-CP',
    docType: 'Nghị định',
    issuingAuthority: 'Chính phủ',
    title:
      'Quy định chi tiết và hướng dẫn thi hành Luật Thuế thu nhập doanh nghiệp',
    latestEffectiveFrom: '2014-02-15',
    latestEffectiveTo: null,
    amends: [],
    amendedBy: [],
  },
  {
    id: 'ls-78',
    documentNumber: '78/2014/TT-BTC',
    docType: 'Thông tư',
    issuingAuthority: 'Bộ Tài chính',
    title: 'Hướng dẫn thi hành Nghị định số 218/2013/NĐ-CP',
    latestEffectiveFrom: '2014-08-02',
    latestEffectiveTo: null,
    amends: [],
    amendedBy: [
      { id: 'ls-96', documentNumber: '96/2015/TT-BTC', relationType: 'AMENDS' },
    ],
  },
  {
    id: 'ls-96',
    documentNumber: '96/2015/TT-BTC',
    docType: 'Thông tư',
    issuingAuthority: 'Bộ Tài chính',
    title:
      'Hướng dẫn về thuế thu nhập doanh nghiệp tại Nghị định số 12/2015/NĐ-CP',
    latestEffectiveFrom: '2015-08-06',
    latestEffectiveTo: null,
    amends: [
      { id: 'ls-78', documentNumber: '78/2014/TT-BTC', relationType: 'AMENDS' },
    ],
    amendedBy: [],
  },
]

export function demoPage(filter: LegalSourceFilter): LegalSourcePage {
  const q = filter.q.trim().toLowerCase()
  const items = SOURCES.filter(
    (s) =>
      (!q ||
        s.documentNumber.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q)) &&
      (!filter.docType || s.docType === filter.docType)
  )
  return { items, page: 1, pageSize: 20, total: items.length }
}

export function demoTree(id: string): AmendmentNode {
  const node = (
    s: LegalSource,
    relationType: string | null,
    children: AmendmentNode[]
  ): AmendmentNode => ({
    id: s.id,
    documentNumber: s.documentNumber,
    title: s.title,
    docType: s.docType,
    relationType,
    affectedArticles: null,
    children,
  })
  const [decree, original, amending] = SOURCES
  if (id === decree.id) return node(decree, null, [])
  return node(original, null, [node(amending, 'AMENDS', [])])
}
