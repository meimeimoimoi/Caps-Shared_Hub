import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Eye, FileText, Upload } from 'lucide-react'
import { cn, formatDayMonth } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import {
  errorToast,
  type ToastContent,
} from '@/components/ui/feedback/toast-content'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import {
  FIELD_TYPE,
  TEMPLATE_CATEGORY,
  TEMPLATE_STATUS,
} from '../../features/knowledgeAdmin-templates/constants'
import { useManagedTemplate } from '../../features/knowledgeAdmin-templates/hooks/useTemplates'
import { TemplatePreview } from '../../features/knowledgeAdmin-templates/components/TemplatePreview'

/* Chi tiết template: cấu trúc trường theo phiên bản (bên trái), trạng thái + lịch sử phiên bản (bên phải) */
export default function KnowledgeTemplatePage() {
  const id = useParams().id!
  const nav = useKnowledgeNav()
  const { template, isLoading, error, setStatus, publish, uploadFile } =
    useManagedTemplate(id)
  const [uploading, setUploading] = useState(false)
  const [params, setParams] = useSearchParams()
  const [confirming, setConfirming] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState<'confirm' | 'busy' | null>(null)
  const [toast, setToast] = useState<ToastContent | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const listLink = (
    <Link to="/knowledge/templates" className="hover:text-fg-strong">
      Template
    </Link>
  )
  const layout = {
    ...nav,
    section: 'templates' as const,
    title: template?.title,
  }

  if (!template) {
    return (
      <KnowledgeLayout {...layout} breadcrumb={listLink}>
        {isLoading ? (
          <h1 className="text-h1">Đang tải…</h1>
        ) : (
          <EmptyState
            tone="error"
            title={
              error
                ? 'Không tải được template'
                : `Không tìm thấy template ${id}`
            }
            actions={
              <Link
                to="/knowledge/templates"
                className="btn btn-press btn-secondary no-underline"
              >
                Quay lại danh sách
              </Link>
            }
          >
            {error?.message}
          </EmptyState>
        )}
      </KnowledgeLayout>
    )
  }

  const current = template.versions[0]
  // ?v=2 để xem phiên bản cũ; mặc định là phiên bản đang phát hành
  const selected =
    template.versions.find((v) => String(v.version) === params.get('v')) ??
    current
  // Nhóm trường theo group, giữ thứ tự xuất hiện (Map.groupBy cần lib ES2024, dự án chưa bật)
  const groups = new Map<string, typeof selected.fields>()
  for (const f of selected.fields)
    groups.set(f.group, [...(groups.get(f.group) ?? []), f])
  const totalWorkspaces = template.versions.reduce(
    (s, v) => s + v.workspaces,
    0
  )
  const active = template.status === 'ACTIVE'
  // A template that never had a released version is activated for the first time, not "again"
  const everReleased = template.versions.some((v) => v.status !== 'DRAFT')
  const activateLabel = everReleased ? 'Kích hoạt lại' : 'Kích hoạt'
  // The server attaches files to a draft only; demo data has no status and no upload
  const draft = current.status === 'DRAFT'
  const anchored = (v: typeof current) =>
    v.fields.some((f) => f.anchor) && !v.hasFile
  // Fields point at blanks in a file that is not there: users would get no form layout
  const missingFile = draft && anchored(current)
  const publishedNoFile =
    !draft && current.status === 'PUBLISHED' && anchored(current)
  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setToast('Chỉ nhận file Word .docx')
      return
    }
    setUploading(true)
    uploadFile(file)
      .then(() => setToast(`Đã tải file mẫu lên v${current.version}`))
      .catch((e: Error) => setToast(`Chưa tải được file mẫu (${e.message})`))
      .finally(() => setUploading(false))
  }

  return (
    <KnowledgeLayout
      {...layout}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            {template.title}
          </span>
        </>
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-fg-muted text-sm">
            {TEMPLATE_CATEGORY[template.category] ?? template.category}
          </p>
          <h1 className="text-h1 mt-1">{template.title}</h1>
          {template.description && (
            <p className="text-fg-muted mt-2 max-w-[65ch]">
              {template.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="num text-fg-strong font-semibold">
              v{current.version}
            </span>
            <StatusBadge status={TEMPLATE_STATUS[template.status]} />
          </div>
        </div>
        {/* Xem trước form người dùng ngay tại đây, theo phiên bản đang chọn */}
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="btn btn-press btn-secondary"
        >
          <Eye size={16} aria-hidden="true" />
          Xem trước
        </button>
      </div>

      <div className="mt-8 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="paper p-5 md:p-6" aria-labelledby="tpl-fields">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="tpl-fields" className="text-h2">
              Cấu trúc trường · v{selected.version}
            </h2>
            <span className="text-fg-muted text-sm">
              {selected.fields.length} trường
            </span>
          </div>
          {selected.fileName && (
            <p className="text-fg-muted mt-1 flex items-center gap-1.5 text-sm">
              <FileText size={14} aria-hidden="true" />
              File mẫu:{' '}
              <span className="text-fg-strong break-all">
                {selected.fileName}
              </span>
            </p>
          )}
          {selected !== current && (
            <p className="bg-sunken rounded-surface text-fg-muted mt-3 px-3 py-2 text-sm">
              Đang xem phiên bản cũ. Bản nháp mới dùng v{current.version}.
            </p>
          )}
          {selected.fields.length === 0 ? (
            <p className="text-fg-muted mt-4 text-sm">
              Phiên bản này chưa có cấu trúc trường.
            </p>
          ) : (
            [...groups].map(([group, fields]) => (
              <div key={group} className="mt-5">
                <h3 className="text-fg-muted text-sm font-semibold">{group}</h3>
                <ul className="divide-border-subtle border-border-subtle mt-2 divide-y border-t text-sm">
                  {fields.map((f) => (
                    <li
                      key={f.id}
                      className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_6rem]"
                    >
                      <div className="min-w-0">
                        <p className="text-fg-strong">{f.label}</p>
                        {(f.hint || f.pattern || f.maxLength) && (
                          <p className="text-fg-muted text-caption">
                            {[
                              f.hint,
                              f.pattern && `Mẫu: ${f.pattern}`,
                              f.maxLength && `Tối đa ${f.maxLength} ký tự`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-fg-muted">
                        {FIELD_TYPE[f.type]}
                      </span>
                      <span
                        className={
                          f.required ? 'text-fg-strong' : 'text-fg-muted'
                        }
                      >
                        {f.required ? 'Bắt buộc' : 'Không bắt buộc'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <div className="space-y-4 lg:sticky lg:top-20">
          <section className="paper p-5" aria-labelledby="tpl-status">
            <h2 id="tpl-status" className="text-h2">
              Trạng thái
            </h2>
            <p className="text-fg-muted mt-2 text-sm">
              {active
                ? 'Người dùng đang chọn được template này khi soạn nháp.'
                : 'Người dùng không tạo được bản nháp mới từ template này.'}{' '}
              <span className="num">{totalWorkspaces}</span> bản nháp đang dùng.
            </p>
            {missingFile && (
              <p role="status" className="text-warning mt-3 text-sm">
                v{current.version} chưa có file mẫu nên chưa phát hành được. Tải
                file .docx lên trước.
              </p>
            )}
            {publishedNoFile && (
              <p role="status" className="text-warning mt-3 text-sm">
                v{current.version} chưa có file mẫu. Để bổ sung, vào{' '}
                <Link to="/knowledge/templates/new" className="underline">
                  Tạo template
                </Link>{' '}
                và nhập mã {template.code} để tạo bản nháp mới kèm file.
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!active && missingFile}
              className={cn(
                'btn btn-press mt-4 w-full',
                active ? 'btn-secondary' : 'btn-primary'
              )}
            >
              {active ? 'Tạm ngưng template' : `${activateLabel} template`}
            </button>
            {template.draftPending && (
              <button
                type="button"
                onClick={() => setPublishing('confirm')}
                disabled={missingFile || publishing === 'busy'}
                className="btn btn-press btn-primary mt-2 w-full"
              >
                {publishing === 'busy'
                  ? 'Đang phát hành…'
                  : `Phát hành v${current.version}`}
              </button>
            )}
            {draft && (
              <label
                className={cn(
                  'btn btn-press btn-secondary mt-2 w-full cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                  uploading && 'pointer-events-none opacity-60'
                )}
              >
                <Upload size={16} aria-hidden="true" />
                {uploading
                  ? 'Đang tải lên…'
                  : current.hasFile
                    ? 'Thay file mẫu'
                    : 'Tải file mẫu'}
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    pickFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </section>

          <section className="paper p-5" aria-labelledby="tpl-versions">
            <h2 id="tpl-versions" className="text-h2">
              Phiên bản
            </h2>
            <ul className="mt-3 space-y-1 text-sm">
              {template.versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-current={v === selected ? 'true' : undefined}
                    onClick={() =>
                      setParams(v === current ? {} : { v: String(v.version) }, {
                        replace: true,
                      })
                    }
                    className={cn(
                      'hover:bg-desk-2 -mx-2 w-[calc(100%+1rem)] rounded px-2 py-2 text-left',
                      v === selected && 'bg-sunken'
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="num text-fg-strong font-semibold">
                        v{v.version}
                        {(v.status
                          ? v.status === 'PUBLISHED'
                          : v === current) && (
                          <span className="text-fg-muted ml-2 font-normal">
                            đang phát hành
                          </span>
                        )}
                      </span>
                      <span className="num text-fg-muted">
                        {formatDayMonth(v.publishedAt)}
                      </span>
                    </span>
                    <span className="text-fg-muted mt-0.5 block">
                      {v.changelog}
                    </span>
                    <span className="text-fg-muted text-caption mt-0.5 block">
                      <span className="num">{v.workspaces}</span> bản nháp ·{' '}
                      {v.publishedBy}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="paper p-5" aria-labelledby="tpl-history">
            <h2 id="tpl-history" className="text-h2">
              Nhật ký
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {template.history.map((h) => (
                <li key={h.at + h.text} className="flex gap-3">
                  <span className="num text-fg-muted w-12 shrink-0">
                    {formatDayMonth(h.at)}
                  </span>
                  <span>
                    <span className="text-fg-strong">{h.actor}</span> · {h.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Hỏi lại kèm hệ quả: bản nháp đang có giữ nguyên phiên bản đã ghim */}
      {previewing && (
        <TemplatePreview
          template={template}
          version={selected}
          onClose={() => setPreviewing(false)}
        />
      )}
      {confirming && (
        <Modal
          title={active ? 'Tạm ngưng template?' : `${activateLabel} template?`}
          description={
            active
              ? `Người dùng sẽ không tạo được bản nháp mới từ "${template.title}". ${totalWorkspaces} bản nháp đang dùng vẫn tiếp tục bình thường.`
              : `Người dùng chọn được lại "${template.title}" khi soạn nháp, với phiên bản v${current.version}.`
          }
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-press btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setStatus(active ? 'INACTIVE' : 'ACTIVE')
                    .then(() =>
                      setToast(
                        active
                          ? 'Đã tạm ngưng template'
                          : `Đã ${activateLabel.toLowerCase()} template`
                      )
                    )
                    .catch((e: Error) => setToast(e.message))
                }}
                className="btn btn-press btn-primary"
              >
                {active ? 'Tạm ngưng' : activateLabel}
              </button>
            </>
          }
        />
      )}
      {publishing === 'confirm' && (
        <Modal
          title={`Phát hành v${current.version}?`}
          description={`v${current.version} trở thành phiên bản hiện hành của "${template.title}". ${totalWorkspaces} bản nháp đang có vẫn giữ phiên bản lúc tạo.`}
          onClose={() => setPublishing(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPublishing(null)}
                className="btn btn-press btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublishing('busy')
                  publish()
                    .then(() => setToast(`Đã phát hành v${current.version}`))
                    .catch((e: Error) => setToast(errorToast(e.message)))
                    .finally(() => setPublishing(null))
                }}
                className="btn btn-press btn-primary"
              >
                Phát hành
              </button>
            </>
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
