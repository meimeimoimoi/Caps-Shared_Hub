import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Pagination } from '@/components/ui/navigation/pagination'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { DOC_TYPES } from '../../features/knowledgeAdmin-review-approval/constants'
import { PAGE_SIZE } from '../../features/legal-sources/api/legalSourcesApi'
import {
  AMENDED_BY_LABEL,
  RELATION_LABEL,
} from '../../features/legal-sources/constants'
import { useLegalSources } from '../../features/legal-sources/hooks/useLegalSources'
import type { LegalSource } from '../../features/legal-sources/types'

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3'
const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-base font-normal'

const validity = (s: LegalSource) =>
  s.latestEffectiveFrom
    ? `${formatDate(s.latestEffectiveFrom)}${s.latestEffectiveTo ? ` – ${formatDate(s.latestEffectiveTo)}` : ''}`
    : 'Chưa có bản đã duyệt'

const relations = (s: LegalSource) => [
  ...s.amends.map(
    (l) =>
      `${RELATION_LABEL[l.relationType] ?? l.relationType} ${l.documentNumber}`
  ),
  ...s.amendedBy.map(
    (l) =>
      `${AMENDED_BY_LABEL[l.relationType] ?? l.relationType} ${l.documentNumber}`
  ),
]

/* Legal sources in the knowledge base: search by number or title, open a source to see its amendment tree */
export default function KnowledgeLegalSourcesPage() {
  const nav = useKnowledgeNav()
  const [q, setQ] = useState('')
  const [docType, setDocType] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(q)
  const sources = useLegalSources({ q: search, docType, page })
  const items = sources.data?.items ?? []
  const total = sources.data?.total ?? 0

  return (
    <KnowledgeLayout
      {...nav}
      section="legalSources"
      breadcrumb="Tra cứu văn bản"
      search={q}
      onSearchChange={(value) => {
        setQ(value)
        setPage(1)
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1">Tra cứu văn bản</h1>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Loại văn bản
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value)
              setPage(1)
            }}
            className={inputCls}
          >
            <option value="">Tất cả</option>
            {DOC_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="paper mt-6 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Số hiệu</th>
              <th className="text-left">Tên văn bản</th>
              <th className="text-left">Hiệu lực</th>
              <th className="text-left">Quan hệ sửa đổi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className={rowCls}>
                <td className="whitespace-nowrap">
                  <Link
                    to={`/knowledge/legal-sources/${s.id}`}
                    className="text-fg-strong num font-semibold underline underline-offset-4"
                  >
                    {s.documentNumber}
                  </Link>
                  <p className="text-fg-muted">{s.docType}</p>
                </td>
                <td>
                  <p className="text-fg-strong">{s.title}</p>
                  {s.issuingAuthority && (
                    <p className="text-fg-muted">{s.issuingAuthority}</p>
                  )}
                </td>
                <td className="num whitespace-nowrap">{validity(s)}</td>
                <td className="text-fg-muted">
                  {relations(s).length
                    ? relations(s).map((text) => <p key={text}>{text}</p>)
                    : '—'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={4}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {sources.isLoading
                    ? 'Đang tải…'
                    : (sources.error?.message ?? 'Không tìm thấy văn bản nào.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {total > PAGE_SIZE && (
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            label="Phân trang văn bản"
          />
        </div>
      )}
    </KnowledgeLayout>
  )
}
