import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Trash2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SchemaField } from '@/features/drafting/types'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import {
  FIELD_TYPE,
  TEMPLATE_CATEGORY,
} from '../../features/knowledgeAdmin-templates/constants'
import { useCreateTemplate } from '../../features/knowledgeAdmin-templates/hooks/useTemplates'
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

type Draft = Omit<SchemaField, 'id'> & { key: number }
const emptyField = (key: number, group = ''): Draft => ({
  key,
  label: '',
  group,
  type: 'text',
  required: true,
  hint: '',
})

/* Tải lên template: file mẫu (.docx), thông tin chung, các chỗ trống người dùng phải điền, ghi chú phát hành.
 * Tải xong là v1 ở trạng thái Tạm ngưng; admin kiểm tra rồi mới kích hoạt cho người dùng thấy. */
export default function KnowledgeTemplateNewPage() {
  const nav = useKnowledgeNav()
  const navigate = useNavigate()
  const create = useCreateTemplate()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [changelog, setChangelog] = useState('')
  const [fields, setFields] = useState<Draft[]>([emptyField(1)])
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = {
    fileName: file?.name ?? '',
    title: title.trim(),
    description: description.trim(),
    category,
    changelog: changelog.trim() || 'Phiên bản đầu tiên.',
    fields: fields.map(({ key: _key, hint, ...f }) => ({
      ...f,
      id: toFieldId(f.label),
      label: f.label.trim(),
      group: f.group.trim(),
      ...(hint?.trim() ? { hint: hint.trim() } : {}),
    })),
  }
  const issues = templateIssues(input)
  const groups = [...new Set(fields.map((f) => f.group.trim()).filter(Boolean))]
  // Kéo thả bỏ qua `accept` của input nên kiểm tra đuôi file tại đây; tên template mặc định lấy theo tên file
  const pick = (f?: File) => {
    if (!f) return
    if (!/\.docx$/i.test(f.name))
      return setFileError('Chỉ nhận file Word (.docx).')
    setFileError(null)
    setFile(f)
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
      title="Tải lên template"
      breadcrumb={
        <>
          <Link to="/knowledge/templates" className="hover:text-fg-strong">
            Template
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            Tải lên template
          </span>
        </>
      }
    >
      <h1 className="text-h1">Tải lên template</h1>
      <p className="text-fg-muted mt-3 max-w-[65ch]">
        Tải file mẫu văn bản và khai báo các chỗ trống người dùng phải điền.
        Template mới ở trạng thái Tạm ngưng; kiểm tra lại rồi bấm Kích hoạt để
        người dùng chọn được khi soạn nháp.
      </p>

      <form
        noValidate
        className="mt-8 max-w-3xl space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (issues.length) return setTried(true)
          setBusy(true)
          setError(null)
          create(file!, input)
            .then((id) => navigate(`/knowledge/templates/${id}`))
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false))
        }}
      >
        <section className="paper p-5 md:p-6" aria-labelledby="new-file">
          <h2 id="new-file" className="text-h2">
            File mẫu
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
        </section>

        <section
          className="paper space-y-4 p-5 md:p-6"
          aria-labelledby="new-info"
        >
          <h2 id="new-info" className="text-h2">
            Thông tin chung
          </h2>
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
              Chưa tải lên được template, còn thiếu:
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
            {busy ? 'Đang tải lên…' : 'Tải lên template'}
          </button>
          <Link
            to="/knowledge/templates"
            className="btn btn-press btn-secondary no-underline"
          >
            Hủy
          </Link>
        </div>
      </form>
    </KnowledgeLayout>
  )
}
