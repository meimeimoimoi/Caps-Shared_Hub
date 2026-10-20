import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { RAIL_DOCUMENT } from '@/lib/constants'
import { ToolHeader } from '@/components/ui/layout/tool-header'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { VersionCompare } from '../../features/knowledgeAdmin-review-approval/components/VersionCompare'
import { RejectDialog } from '../../features/knowledgeAdmin-review-approval/components/RejectDialog'
import { useVersionReview } from '../../features/knowledgeAdmin-review-approval/hooks/useVersionReview'

const queueLink = (
  <Link to="/knowledge/queue" className="text-fg-muted hover:text-fg-strong">
    Hàng đợi duyệt
  </Link>
)

export default function KnowledgeVersionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const nav = useKnowledgeNav()
  const { comparison: c, isLoading, error, continueReview, reject } =
    useVersionReview(id)
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Xong thì về hàng đợi; toast hiện ở đó qua location.state
  const run = (action: Promise<unknown>, toast: string) => {
    setBusy(true)
    setActionError(null)
    action
      .then(() => navigate('/knowledge/queue', { state: { toast } }))
      .catch((e: Error) => {
        setBusy(false)
        setActionError(e.message)
      })
  }

  if (!c) {
    return (
      <KnowledgeLayout {...nav} section="queue" breadcrumb={queueLink}>
        <h1 className="text-h1-tool">
          {isLoading
            ? 'Đang tải…'
            : (error?.message ?? 'Văn bản không có phiên bản cần so sánh')}
        </h1>
      </KnowledgeLayout>
    )
  }

  const count = (kind: string) =>
    c.changes.filter((ch) => ch.kind === kind).length

  return (
    <KnowledgeLayout
      {...nav}
      section="queue"
      breadcrumb={
        <>
          {queueLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong num" aria-current="page">
            {c.number}
          </span>
        </>
      }
    >
      <ToolHeader
        code={c.number}
        subtitle={`${c.title} · v${c.version}`}
        rail={{ steps: RAIL_DOCUMENT, current: 1 }}
      />

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span>
          <span className="num">{count('MODIFIED')}</span> Điều sửa
        </span>
        <span>
          <span className="num">{count('ADDED')}</span> Điều thêm
        </span>
        <span>
          <span className="num">{count('REMOVED')}</span> Điều bỏ
        </span>
        <span className="text-fg-muted">
          Thu thập {c.collectedBy === 'AUTO' ? 'tự động' : 'thủ công'}{' '}
          <span className="num">{formatDateTime(c.collectedAt)}</span>
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejecting(true)}
            className="btn btn-press bg-danger text-paper"
          >
            Từ chối v{c.version}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(continueReview(), `Đã chuyển v${c.version} sang bước Bóc tách`)
            }
            className="btn btn-press btn-primary"
          >
            Tiếp tục rà soát v{c.version}
          </button>
        </div>
      </div>
      {actionError && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {actionError}
        </p>
      )}

      <div className="bg-sunken rounded-surface mt-6 flex gap-2 p-3 text-sm">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="text-fg-strong font-semibold">
            v{c.prevVersion} vẫn được AI/RAG dùng cho tới khi v{c.version} index
            xong
          </p>
          <p className="text-fg-muted">
            Sau đó v{c.prevVersion} chuyển sang Đã thay thế và không còn được
            truy vấn.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <VersionCompare
          changes={c.changes}
          prevVersion={c.prevVersion}
          version={c.version}
        />
      </div>

      {rejecting && (
        <RejectDialog
          title={`Từ chối v${c.version}?`}
          description={`v${c.prevVersion} tiếp tục được dùng. Phiên bản mới bị loại khỏi hàng đợi.`}
          confirmLabel={`Từ chối v${c.version}`}
          onClose={() => setRejecting(false)}
          onConfirm={(reason) =>
            reject(reason).then(() =>
              navigate('/knowledge/queue', {
                state: { toast: `Đã từ chối v${c.version}` },
              })
            )
          }
        />
      )}
    </KnowledgeLayout>
  )
}
