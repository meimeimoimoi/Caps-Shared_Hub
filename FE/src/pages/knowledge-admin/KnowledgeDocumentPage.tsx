import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { DOCUMENT_STATUS } from '@/lib/constants'
import { useNavToast } from '@/hooks/useNavToast'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { ArticleContent } from '../../features/knowledgeAdmin-review-approval/components/ArticleContent'
import { DocumentTimeline } from '../../features/knowledgeAdmin-review-approval/components/DocumentTimeline'
import { StructureTree } from '../../features/knowledgeAdmin-review-approval/components/StructureTree'
import { SOURCE_LABEL } from '../../features/knowledgeAdmin-review-approval/constants'
import { useDocumentDetail } from '../../features/knowledgeAdmin-review-approval/hooks/useDocumentDetail'
import type { DocumentDetail } from '../../features/knowledgeAdmin-review-approval/types'

const tabs = [
  { key: 'content', label: 'Nội dung' },
  { key: 'versions', label: 'Phiên bản' },
  { key: 'chunks', label: 'Đoạn đã index' },
  { key: 'history', label: 'Lịch sử' },
] as const
type Tab = (typeof tabs)[number]['key']

const headCls = 'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'

export default function KnowledgeDocumentPage() {
  const { id = '' } = useParams()
  const nav = useKnowledgeNav()
  const { data: doc, isLoading, error } = useDocumentDetail(id)

  return (
    <KnowledgeLayout
      {...nav}
      section="documents"
      breadcrumb={
        <>
          Tất cả văn bản
          {doc && (
            <>
              {' '}
              <span aria-hidden="true">/</span>{' '}
              <span className="text-fg-strong num" aria-current="page">
                {doc.number}
              </span>
            </>
          )}
        </>
      }
    >
      {doc ? (
        <DocumentView doc={doc} />
      ) : (
        <h1 className="text-h1-tool">
          {isLoading ? 'Đang tải…' : (error?.message ?? `Không tìm thấy văn bản ${id}`)}
        </h1>
      )}
    </KnowledgeLayout>
  )
}

function DocumentView({ doc }: { doc: DocumentDetail }) {
  const [tab, setTab] = useState<Tab>('versions')
  // Màn rà soát chuyển sang đây sau khi duyệt, kèm { toast }
  const { toast, clearToast } = useNavToast()
  const articles = doc.chapters.flatMap((c) => c.articles)
  const [articleId, setArticleId] = useState(articles[0]?.id)
  const article = articles.find((a) => a.id === articleId)

  // Tab ARIA: mũi tên trái/phải, Home/End chuyển tab và chuyển focus theo
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === tab)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const key = tabs[(next + tabs.length) % tabs.length].key
    setTab(key)
    document.getElementById(`tab-${key}`)?.focus()
  }

  return (
    <>
      <CaseHeader
        code={doc.number}
        title={doc.title}
        meta={[
          ['Phiên bản', `v${doc.currentVersion}`],
          ['Cơ quan', doc.issuer],
          ['Index lúc', doc.rag ? formatDateTime(doc.rag.indexedAt) : 'Chưa index'],
        ]}
      />
      <div className="mt-8">
        <DocumentTimeline timeline={doc.timeline} />
      </div>

      <div className="mt-10 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Thông tin văn bản"
            onKeyDown={onTabKey}
            className="mb-4 flex gap-7 overflow-x-auto"
          >
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-controls={`panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                className={cn(
                  'border-b-2 pb-2 whitespace-nowrap',
                  tab === key
                    ? 'border-indicator text-fg-strong font-semibold'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'content' &&
              (article ? (
                <div className="grid items-start gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                  <StructureTree
                    chapters={doc.chapters}
                    selectedId={articleId}
                    onSelect={setArticleId}
                  />
                  <section className="paper p-5 md:p-6">
                    <ArticleContent article={article} />
                  </section>
                </div>
              ) : (
                <Empty>Chưa có nội dung bóc tách.</Empty>
              ))}

            {tab === 'versions' && (
              <section className="paper overflow-x-auto">
                <table className="w-full min-w-150 text-sm">
                  <thead>
                    <tr className={headCls}>
                      <th className="text-left">Phiên bản</th>
                      <th className="text-right">Thu thập</th>
                      <th className="text-left">Nguồn</th>
                      <th className="text-left">Người duyệt</th>
                      <th className="text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.versions.map((v) => (
                      <tr key={v.no} className={rowCls}>
                        <td className="text-fg-strong num font-semibold">v{v.no}</td>
                        <td className="num text-right">{formatDate(v.collectedAt)}</td>
                        <td>{SOURCE_LABEL[v.source]}</td>
                        <td>
                          {v.reviewer && v.reviewedAt ? (
                            <>
                              {v.reviewer} · <span className="num">{formatDate(v.reviewedAt)}</span>
                            </>
                          ) : (
                            <span className="text-fg-muted">Chưa duyệt</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={DOCUMENT_STATUS[v.status]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {tab === 'chunks' &&
              (doc.rag ? (
                <section className="paper">
                  <p className="text-fg-muted px-4 py-3 text-sm">
                    Hiển thị <span className="num">{doc.chunks.length}</span> trên{' '}
                    <span className="num">{doc.rag.chunkCount}</span> đoạn
                  </p>
                  <ul className="divide-border-subtle border-border-subtle divide-y border-t">
                    {doc.chunks.map((c) => (
                      <li key={c.id} className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[180px_1fr]">
                        <span>
                          <span className="text-fg-strong block font-semibold">{c.path}</span>
                          <span className="text-fg-muted num text-caption">{c.id}</span>
                        </span>
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <Empty>Văn bản chưa được index.</Empty>
              ))}

            {tab === 'history' && <HistoryTab title="Lịch sử" history={doc.history} />}
          </div>
        </div>

        <div className="space-y-4">
          <RagStatus rag={doc.rag} />
          <section className="paper p-5">
            <h2 className="text-h2">Metadata</h2>
            <dl className="divide-border-subtle mt-3 divide-y text-sm">
              {[
                ['Số hiệu', doc.number],
                ['Loại', doc.docType],
                ['Cơ quan', doc.issuer],
                ['Phiên bản hiện hành', `v${doc.currentVersion}`],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2">
                  <dt className="text-fg-muted">{label}</dt>
                  <dd className="text-fg-strong num">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  )
}

/* Các bước đưa văn bản vào AI/RAG sau khi duyệt */
function RagStatus({ rag }: { rag: DocumentDetail['rag'] }) {
  const steps = rag && [
    { label: 'Duyệt', detail: `${rag.approvedBy} · ${formatDateTime(rag.approvedAt)}` },
    { label: 'Chia đoạn', detail: `${rag.chunkCount} đoạn theo Điều, Khoản, Điểm` },
    {
      label: 'Tạo vector và metadata',
      detail: `${rag.vectorCount} vector · source_id, version_id, article, clause, point, effective_date, status`,
    },
    { label: 'Index vào Qdrant Shared KB', detail: `Hoàn tất ${formatDateTime(rag.indexedAt)}` },
  ]
  return (
    <section className="paper p-5">
      <h2 className="text-h2">Trạng thái AI/RAG</h2>
      {steps ? (
        <ul className="divide-border-subtle mt-3 divide-y text-sm">
          {steps.map((s) => (
            <li key={s.label} className="flex gap-2 py-2.5">
              <Check size={16} aria-hidden="true" className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-fg-strong font-semibold">{s.label}</p>
                <p className="text-fg-muted num text-caption">{s.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-muted mt-3 text-sm">
          Chưa được AI/RAG dùng. Văn bản phải được duyệt và index xong.
        </p>
      )}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="paper text-fg-muted px-4 py-10 text-center text-sm">{children}</p>
}
