import { useCallback, useState } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { ScheduleCard } from '../../features/knowledgeAdmin-sources/components/ScheduleCard'
import { SourceDialog } from '../../features/knowledgeAdmin-sources/components/SourceDialog'
import type { CollectionSource } from '../../features/knowledgeAdmin-sources/types'
import {
  RUN_TRIGGER,
  SOURCE_STATUS,
} from '../../features/knowledgeAdmin-sources/constants'
import { useCollection } from '../../features/knowledgeAdmin-sources/hooks/useCollection'

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'

export default function KnowledgeSourcesPage() {
  const nav = useKnowledgeNav()
  const collection = useCollection()
  const { data } = collection
  const [running, setRunning] = useState(false)
  /** 'new' = thêm nguồn; một nguồn = đang sửa nguồn đó */
  const [editing, setEditing] = useState<CollectionSource | 'new' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const runNow = () => {
    setRunning(true)
    collection
      .runNow()
      .then(() => setToast('Đã bắt đầu thu thập, kết quả hiện ở Lịch sử'))
      .catch((e: Error) => setToast(e.message))
      .finally(() => setRunning(false))
  }

  return (
    <KnowledgeLayout {...nav} section="sources" breadcrumb="Nguồn thu thập">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">Nguồn thu thập</h1>
          <p className="text-fg-muted mt-3">
            Văn bản mới hoặc có thay đổi sẽ được bóc tách và đưa vào hàng đợi
            duyệt. Văn bản không đổi được bỏ qua.
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="btn btn-press btn-primary"
        >
          {running ? 'Đang chạy…' : 'Chạy thu thập ngay'}
        </button>
      </div>

      {!data ? (
        <p className="text-fg-muted mt-12">
          {collection.isLoading ? 'Đang tải…' : collection.error?.message}
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          <ScheduleCard
            key={data.schedule.frequency}
            schedule={data.schedule}
            onSave={(f) =>
              collection
                .saveSchedule(f)
                .then(() => setToast('Đã lưu lịch thu thập'))
                .catch((e: Error) => setToast(e.message))
            }
          />

          <section className="paper overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-h2">Nguồn</h2>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="btn btn-press btn-secondary"
              >
                <Plus size={16} aria-hidden="true" />
                Thêm nguồn
              </button>
            </div>
            <table className="w-full min-w-200 text-sm">
              <thead>
                <tr className={headCls}>
                  <th className="text-left">Nguồn</th>
                  <th className="text-left">Phạm vi thu thập</th>
                  <th className="text-left">Trạng thái</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.id} className={rowCls}>
                    <td>
                      <p className="text-fg-strong">{s.name}</p>
                      {s.url && (
                        <p className="text-fg-muted text-caption break-all">
                          {s.url}
                        </p>
                      )}
                    </td>
                    <td className="text-fg-muted">{s.scope ?? '—'}</td>
                    <td>
                      <StatusBadge status={SOURCE_STATUS[s.status]} />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        aria-label={`Sửa nguồn ${s.name}`}
                        className="text-fg-strong underline underline-offset-4"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="paper overflow-x-auto">
            <h2 className="text-h2 px-4 py-3">Lịch sử thu thập</h2>
            <table className="w-full min-w-200 text-sm">
              <thead>
                <tr className={headCls}>
                  <th className="text-left">Thời điểm</th>
                  <th className="text-left">Kiểu chạy</th>
                  <th className="text-left">Kết quả</th>
                  <th className="text-left">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((r) => (
                  <tr key={r.at} className={rowCls}>
                    <td className="num">{formatDateTime(r.at)}</td>
                    <td>
                      {RUN_TRIGGER[r.trigger]}
                      {r.actor && ` · ${r.actor}`}
                    </td>
                    <td className="num">
                      {r.newDocs} mới · {r.newVersions} phiên bản mới ·{' '}
                      {r.unchanged} không đổi
                    </td>
                    <td>
                      {r.errors > 0 ? (
                        <span className="text-warning inline-flex items-center gap-1.5">
                          <TriangleAlert size={14} aria-hidden="true" />
                          <span className="num">{r.errors}</span> lỗi trích xuất
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {editing && (
        <SourceDialog
          source={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            collection
              .saveSource(input, editing === 'new' ? undefined : editing.id)
              .then(() =>
                setToast(editing === 'new' ? 'Đã thêm nguồn' : 'Đã lưu nguồn')
              )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
