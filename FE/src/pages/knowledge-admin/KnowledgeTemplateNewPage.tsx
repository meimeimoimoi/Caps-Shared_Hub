import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardPaste,
  FileText,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SchemaField } from '@/features/drafting/types'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import {
  FIELD_TYPE,
  TEMPLATE_CATEGORY,
} from '../../features/knowledgeAdmin-templates/constants'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import {
  TemplateFormPreview,
  TemplatePaperPreview,
} from '../../features/knowledgeAdmin-templates/components/TemplatePreview'
import { DocxPreview } from '../../features/knowledgeAdmin-templates/components/DocxPreview'
import {
  parseQuickFields,
  toQuickText,
} from '../../features/knowledgeAdmin-templates/utils/quickFields'
import {
  fieldAnchor,
  fieldsFromDocx,
  type Anchor,
  type FoundField,
} from '../../features/knowledgeAdmin-templates/utils/docxFields'
import {
  docxBlocks,
  renderDocx,
} from '../../features/knowledgeAdmin-templates/utils/renderDocx'
import {
  useCreateTemplate,
  useTemplates,
} from '../../features/knowledgeAdmin-templates/hooks/useTemplates'
import { sampleFills } from '../../features/knowledgeAdmin-templates/utils/sampleFills'
import {
  templateIssues,
  toFieldId,
} from '../../features/knowledgeAdmin-templates/utils/validation'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {hint && (
        <span className="text-fg-muted text-caption font-normal">{hint}</span>
      )}
    </label>
  )
}

// anchor: the blank chosen in the file; null = none, unset = the blank found under the field's name
type Draft = Omit<SchemaField, 'id' | 'anchor'> & {
  key: number
  anchor?: Anchor | null
}
const emptyField = (key: number, group = ''): Draft => ({
  key,
  label: '',
  group,
  type: 'text',
  required: true,
  hint: '',
})

/* Create a template: optional sample file (.docx), general info, the blanks users must fill, release notes.
 * The new v1 starts inactive; the admin checks it, then activates it for users. */
export default function KnowledgeTemplateNewPage() {
  const nav = useKnowledgeNav()
  const navigate = useNavigate()
  const create = useCreateTemplate()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [code, setCode] = useState('')
  // The server matches templates by code, so saving an existing code updates that template instead of adding one
  const { data: templates } = useTemplates()
  const existing = templates?.find(
    (t) => code.trim() && t.code?.toLowerCase() === code.trim().toLowerCase()
  )
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [changelog, setChangelog] = useState('')
  const [fields, setFields] = useState<Draft[]>([emptyField(1)])
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The blanks found in the file; a field takes one by name or by the admin's choice
  const [blanks, setBlanks] = useState<FoundField[]>([])
  const input = {
    fileName: file?.name ?? '',
    code: code.trim(),
    title: title.trim(),
    description: description.trim(),
    category,
    changelog: changelog.trim() || 'Phiên bản đầu tiên.',
    fields: fields.map(({ key: _key, hint, anchor: chosen, ...f }) => {
      // An anchor only means something next to its file, so a removed file takes the anchors with it
      const anchor = file ? fieldAnchor(blanks, f.label, chosen) : undefined
      return {
        ...f,
        id: toFieldId(f.label),
        label: f.label.trim(),
        group: f.group.trim(),
        ...(hint?.trim() ? { hint: hint.trim() } : {}),
        ...(anchor ? { anchor } : {}),
      }
    }),
  }
  const issues = templateIssues(input)
  const groups = [...new Set(fields.map((f) => f.group.trim()).filter(Boolean))]
  // Unfinished fields still show, under stand-in names, so the layout is visible while typing
  const previewFields = input.fields.map((f, i) => ({
    ...f,
    id: String(fields[i].key),
    label: f.label || `Trường ${i + 1}`,
    group: f.group || 'Chưa đặt nhóm',
  }))
  const [quick, setQuick] = useState<string | null>(null)
  const [scan, setScan] = useState<string | null>(null)
  const scanRun = useRef(0)
  const [view, setView] = useState<'form' | 'paper' | 'file'>('form')
  // The file view falls back to the form once the file is removed
  const shown = view === 'file' && !file ? 'form' : view
  const fills = sampleFills(input.fields)
  const quickFields = parseQuickFields(quick ?? '', fields.at(-1)?.group)
  // Pasted fields go after the ones already typed; untouched blank rows are dropped
  const addQuick = () => {
    setFields((list) => {
      let key = Math.max(...list.map((x) => x.key))
      return [
        ...list.filter((x) => x.label.trim() || x.hint?.trim()),
        // Placed now, so renaming a found field later keeps its blank
        ...quickFields.map((f) => ({
          ...f,
          hint: '',
          key: ++key,
          anchor: fieldAnchor(blanks, f.label),
        })),
      ]
    })
    setQuick(null)
  }
  // Kéo thả bỏ qua `accept` của input nên kiểm tra đuôi file tại đây; tên template mặc định lấy theo tên file
  const pick = (f?: File) => {
    if (!f) return
    if (!/\.docx$/i.test(f.name))
      return setFileError('Chỉ nhận file Word (.docx).')
    setFileError(null)
    setFile(f)
    // Places chosen in the previous file mean nothing in this one; fields find theirs by name again
    setBlanks([])
    setFields((list) => list.map(({ anchor: _anchor, ...x }) => x))
    setView('file')
    // The blanks found in the file land in the quick box, so the admin reviews them before adding
    const run = ++scanRun.current
    setScan('Đang tìm chỗ trống trong file…')
    renderDocx(f)
      .then((root) => fieldsFromDocx(docxBlocks(root)))
      .then((found) => {
        if (run !== scanRun.current) return
        setBlanks(found)
        if (found.length) setQuick(toQuickText(found))
        setScan(
          found.length
            ? `Tìm thấy ${found.length} chỗ trống, đã đưa vào Nhập nhanh để bạn kiểm tra.`
            : 'Không tìm thấy chỗ trống nào trong file; khai báo trường bên dưới.'
        )
      })
      .catch(() => {
        if (run === scanRun.current)
          setScan('Không đọc được file để tìm chỗ trống; khai báo trường bên dưới.')
      })
    if (!title.trim())
      setTitle(f.name.replace(/\.docx$/i, '').replace(/[-_]+/g, ' '))
  }
  const update = (key: number, patch: Partial<Draft>) =>
    setFields((list) =>
      list.map((f) => (f.key === key ? { ...f, ...patch } : f))
    )

  return (
    <KnowledgeLayout
      {...nav}
      section="templates"
      title="Tạo template"
      breadcrumb={
        <>
          <Link to="/knowledge/templates" className="hover:text-fg-strong">
            Template
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            Tạo template
          </span>
        </>
      }
    >
      <h1 className="text-h1">Tạo template</h1>
      <p className="text-fg-muted mt-3 max-w-[65ch]">
        Khai báo các chỗ trống người dùng phải điền; file mẫu (.docx) là tùy chọn.
        Template mới ở trạng thái Tạm ngưng; kiểm tra lại rồi bấm Kích hoạt để
        người dùng chọn được khi soạn nháp.
      </p>

      <div className="mt-8 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] lg:items-start">
      <form
        noValidate
        className="min-w-0 space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (issues.length) return setTried(true)
          setBusy(true)
          setError(null)
          create(file, input)
            .then((id) => navigate(`/knowledge/templates/${id}`))
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false))
        }}
      >
        <section className="paper p-5 md:p-6" aria-labelledby="new-file">
          <h2 id="new-file" className="text-h2">
            File mẫu (tùy chọn)
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            Văn bản Word có sẵn bố cục; AI điền nội dung vào các chỗ trống khai
            báo bên dưới.
          </p>
          {file ? (
            <div className="border-border rounded-control mt-4 flex items-center gap-3 border p-3 text-sm">
              <FileText size={18} aria-hidden="true" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-fg-strong truncate font-semibold">
                  {file.name}
                </p>
                <p className="text-fg-muted num text-caption">
                  {(file.size / 1_048_576).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label={`Bỏ file ${file.name}`}
                className="btn btn-ghost px-2"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              // Chỉ tắt khi thật sự rời vùng thả, không phải khi đi qua phần tử con
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                pick(e.dataTransfer.files[0])
              }}
              className={cn(
                'rounded-control mt-4 flex flex-wrap items-center gap-3 border border-dashed p-4 text-sm',
                dragging
                  ? 'border-accent bg-accent-soft'
                  : 'border-border-control'
              )}
            >
              <label className="btn btn-press btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring)">
                <Upload size={16} aria-hidden="true" />
                Chọn file
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(e) => pick(e.target.files?.[0])}
                />
              </label>
              <span className="text-fg-muted">
                hoặc kéo thả file vào đây · chỉ nhận .docx
              </span>
            </div>
          )}
          {fileError && (
            <p role="alert" className="text-danger mt-2 text-sm">
              {fileError}
            </p>
          )}
          {file && scan && (
            <p role="status" className="mt-2 text-sm">
              {scan}
            </p>
          )}
        </section>

        <section
          className="paper space-y-4 p-5 md:p-6"
          aria-labelledby="new-info"
        >
          <h2 id="new-info" className="text-h2">
            Thông tin chung
          </h2>
          <Field label="Mã template (bắt buộc)">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="vd. 03/TNDN"
              className={`${inputCls} num max-w-56`}
            />
          </Field>
          {existing && (
            <p
              role="status"
              className="bg-warning-soft text-warning rounded-surface px-3 py-2 text-sm"
            >
              Đã có template mã {existing.code}: “{existing.title}”. Lưu với mã
              này sẽ cập nhật template đó (thay bản nháp chưa phát hành nếu có),
              không tạo template mới.{' '}
              <Link
                to={`/knowledge/templates/${existing.id}`}
                className="font-semibold underline"
              >
                Mở template này
              </Link>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label="Tên template (bắt buộc)">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nhóm (bắt buộc)">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>
                  Chọn nhóm
                </option>
                {Object.entries(TEMPLATE_CATEGORY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Mô tả" hint="Người dùng đọc dòng này khi chọn mẫu.">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} h-auto py-2`}
            />
          </Field>
        </section>

        <section className="paper p-5 md:p-6" aria-labelledby="new-fields">
          <h2 id="new-fields" className="text-h2">
            Chỗ trống người dùng cần điền
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            Mỗi chỗ trống trong file mẫu là một trường. Trường cùng nhóm hiện
            chung một khối trên form của người dùng.
          </p>
          <datalist id="field-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <ol className="mt-4 space-y-3">
            {fields.map((f, i) => (
              <li
                key={f.key}
                className="border-border-subtle rounded-surface border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted num text-sm font-semibold">
                    Trường {i + 1}
                  </span>
                  <button
                    type="button"
                    disabled={fields.length === 1}
                    onClick={() =>
                      setFields((list) => list.filter((x) => x.key !== f.key))
                    }
                    aria-label={`Xóa trường ${i + 1}`}
                    className="btn btn-ghost px-2"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label="Tên trường">
                    <input
                      value={f.label}
                      onChange={(e) => update(f.key, { label: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Nhóm">
                    <input
                      list="field-groups"
                      value={f.group}
                      onChange={(e) => update(f.key, { group: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Kiểu dữ liệu">
                    <select
                      value={f.type}
                      onChange={(e) =>
                        update(f.key, {
                          type: e.target.value as SchemaField['type'],
                        })
                      }
                      className={inputCls}
                    >
                      {Object.entries(FIELD_TYPE).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Gợi ý cho người dùng">
                    <input
                      value={f.hint}
                      onChange={(e) => update(f.key, { hint: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                {file && blanks.length > 0 && (
                  <div className="mt-3">
                    <Field label="Vị trí trên file mẫu">
                      <select
                        value={String(
                          blanks.findIndex(
                            (b) => b.anchor === input.fields[i].anchor
                          )
                        )}
                        onChange={(e) =>
                          update(f.key, {
                            anchor:
                              e.target.value === '-1'
                                ? null
                                : blanks[Number(e.target.value)].anchor,
                          })
                        }
                        className={inputCls}
                      >
                        <option value="-1">Không có trên file</option>
                        {blanks.map((b, bi) => (
                          <option key={bi} value={bi}>
                            {b.group} · {b.label}
                            {/* Two fields on one blank would overwrite each other */}
                            {input.fields.some(
                              (x, j) => j !== i && x.anchor === b.anchor
                            )
                              ? ' (đã gán)'
                              : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      update(f.key, { required: e.target.checked })
                    }
                    className="accent-ink size-4"
                  />
                  Bắt buộc nhập
                </label>
              </li>
            ))}
          </ol>
          <button
            type="button"
            // Trường mới lấy nhóm của trường cuối, vì thường nhập liền các trường cùng nhóm
            onClick={() =>
              setFields((list) => [
                ...list,
                emptyField(
                  Math.max(...list.map((x) => x.key)) + 1,
                  list.at(-1)?.group
                ),
              ])
            }
            className="btn btn-press btn-secondary mt-4"
          >
            <Plus size={16} aria-hidden="true" />
            Thêm trường
          </button>
          <button
            type="button"
            aria-expanded={quick !== null}
            onClick={() => setQuick((q) => (q === null ? '' : null))}
            className="btn btn-press btn-secondary mt-4 ml-3"
          >
            <ClipboardPaste size={16} aria-hidden="true" />
            Nhập nhanh
          </button>
          {quick !== null && (
            <div className="border-border-subtle rounded-surface mt-4 border p-4">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  Danh sách trường, mỗi dòng một trường
                  <HelpTip label="Cách nhập nhanh">
                    Mỗi dòng: Nhóm | Tên trường | Kiểu | *. Có thể dán thẳng từ
                    Excel (cột cách nhau bằng tab). Dòng chỉ có tên trường dùng
                    nhóm của dòng trước. Kiểu: chữ, đoạn văn, số tiền, ngày, năm
                    (bỏ trống là chữ). Dấu * là bắt buộc nhập.
                  </HelpTip>
                </span>
                <textarea
                  rows={6}
                  autoFocus
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder={
                    'Thông tin chung | Tên doanh nghiệp | chữ | *\nThông tin chung | Mã số thuế | chữ | *\nKỳ tính thuế | Doanh thu | số tiền'
                  }
                  className={`${inputCls} num h-auto py-2`}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!quickFields.length}
                  onClick={addQuick}
                  className="btn btn-press btn-primary"
                >
                  {quickFields.length
                    ? `Thêm ${quickFields.length} trường`
                    : 'Thêm trường'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuick(null)}
                  className="btn btn-ghost"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="paper p-5 md:p-6" aria-labelledby="new-changelog">
          <h2 id="new-changelog" className="text-h2">
            Ghi chú phát hành
          </h2>
          <div className="mt-3">
            <Field
              label="Ghi chú cho v1"
              hint="Bỏ trống thì ghi là “Phiên bản đầu tiên.”"
            >
              <textarea
                rows={2}
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className={`${inputCls} h-auto py-2`}
              />
            </Field>
          </div>
        </section>

        {tried && issues.length > 0 && (
          <div role="alert" className="text-danger text-sm">
            <p className="font-semibold">
              Chưa tạo được template, còn thiếu:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {issues.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="btn btn-press btn-primary"
          >
            {busy ? 'Đang tạo…' : 'Tạo template'}
          </button>
          <Link
            to="/knowledge/templates"
            className="btn btn-press btn-secondary no-underline"
          >
            Hủy
          </Link>
        </div>
      </form>

      <aside
        aria-labelledby="new-preview"
        className="paper p-5 md:p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="new-preview" className="text-h2">
            Xem trước
          </h2>
          <div className="flex gap-1" role="group" aria-label="Kiểu xem trước">
            {(
              [
                ['form', 'Form'],
                ['paper', 'Trang giấy'],
                ...(file ? [['file', 'File mẫu'] as const] : []),
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={shown === value}
                onClick={() => setView(value)}
                className={cn(
                  'btn px-3',
                  shown === value ? 'btn-secondary' : 'btn-ghost'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {shown === 'file' && file ? (
            <DocxPreview file={file} fills={fills} />
          ) : shown === 'form' ? (
            <TemplateFormPreview
              title={input.title || 'Tên template'}
              description={input.description}
              fields={previewFields}
            />
          ) : (
            <TemplatePaperPreview
              code={input.code}
              title={input.title || 'Tên template'}
              fields={previewFields}
            />
          )}
        </div>
      </aside>
      </div>
    </KnowledgeLayout>
  )
}
