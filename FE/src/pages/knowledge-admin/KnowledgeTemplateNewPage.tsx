import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  FileText,
  Maximize2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type { SchemaField } from '@/features/drafting/types'
import { useUnsavedInput } from '@/features/drafting/hooks/useUnsavedInput'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import {
  FIELD_TYPE,
  TEMPLATE_CATEGORY,
} from '../../features/knowledgeAdmin-templates/constants'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
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
  type TemplateIssue,
} from '../../features/knowledgeAdmin-templates/utils/validation'

// Single-line controls keep the shared control height; text areas take the height of their rows
const fieldCls =
  'border-border-control rounded-control shadow-control bg-paper w-full border px-3 text-base font-normal placeholder:text-fg-muted aria-invalid:border-danger'
const inputCls = `${fieldCls} h-control`
const areaCls = `${fieldCls} py-2`
const iconBtn = 'btn btn-ghost px-2'

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      <span className="flex items-center gap-1.5">
        <span>
          {label}
          {required && (
            <span aria-hidden="true" className="text-danger">
              {' '}
              *
            </span>
          )}
        </span>
        {hint && <HelpTip label={label}>{hint}</HelpTip>}
      </span>
      {children}
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

// Fields stay in display order (by group, groups in order of first appearance), so "Trường N" reads the same everywhere
const regroup = (list: Draft[]) =>
  [...new Set(list.map((f) => f.group.trim()))].flatMap((g) =>
    list.filter((f) => f.group.trim() === g)
  )

// Focus once React has drawn the change (an added or moved row)
const focusSoon = (id: string, fallback?: string) =>
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    const target =
      el && !el.matches(':disabled')
        ? el
        : fallback
          ? document.getElementById(fallback)
          : null
    target?.focus()
  })

/* Create a template, or the next version of one when its code already exists: optional sample file (.docx),
 * general info, the blanks users must fill grouped as they appear on their form. Nothing reaches users until
 * the admin publishes it from the template page. */
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
  const latest = existing?.versions[0]
  // Saving over an unpublished draft replaces it; after a published version it starts the next one
  const nextVersion = latest
    ? latest.version + (latest.status === 'DRAFT' ? 0 : 1)
    : 1
  // Year of the form this version follows; a new year's form is saved as the next version
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()))
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [changelog, setChangelog] = useState('')
  const [fields, setFields] = useState<Draft[]>([emptyField(1)])
  const [open, setOpen] = useState<number | null>(null)
  const [focusKey, setFocusKey] = useState<number>()
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
    taxYear: Number(taxYear),
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
  // Consecutive fields of one group; the list is kept grouped, so each group is one run
  const sections = fields.reduce<
    { name: string; items: { f: Draft; i: number }[] }[]
  >((acc, f, i) => {
    const last = acc.at(-1)
    if (last && last.name === f.group.trim()) last.items.push({ f, i })
    else acc.push({ name: f.group.trim(), items: [{ f, i }] })
    return acc
  }, [])
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
  const [zoomed, setZoomed] = useState(false)
  // With a file its own pages are the paper view, so "Trang giấy" gives way to "File mẫu"
  const shown = file
    ? view === 'form'
      ? 'form'
      : 'file'
    : view === 'file'
      ? 'form'
      : view
  const fills = sampleFills(previewFields)
  const focusId = focusKey === undefined ? undefined : String(focusKey)
  const quickFields = parseQuickFields(quick ?? '', fields.at(-1)?.group)
  const dirty =
    Boolean(file) ||
    [code, title, category, description, changelog].some((v) => v.trim()) ||
    fields.some((f) => f.label.trim() || f.hint?.trim())
  const guard = useUnsavedInput(dirty)

  const edit = (change: (list: Draft[]) => Draft[]) =>
    setFields((list) => regroup(change(list)))
  const update = (key: number, patch: Partial<Draft>) =>
    edit((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  const setGroupFields = (keys: Set<number>, patch: Partial<Draft>) =>
    edit((list) => list.map((f) => (keys.has(f.key) ? { ...f, ...patch } : f)))
  const addField = (group: string) => {
    const key = Math.max(0, ...fields.map((f) => f.key)) + 1
    edit((list) => [...list, emptyField(key, group)])
    focusSoon(`field-${key}-label`)
  }
  const removeField = (key: number) => {
    const i = fields.findIndex((f) => f.key === key)
    const near = fields[i + 1] ?? fields[i - 1]
    edit((list) => list.filter((f) => f.key !== key))
    if (near) focusSoon(`field-${near.key}-label`)
  }
  // Up or down within its group; a group's fields stay together
  const moveField = (key: number, step: -1 | 1) => {
    edit((list) => {
      const i = list.findIndex((f) => f.key === key)
      const j = i + step
      if (list[j]?.group.trim() !== list[i].group.trim()) return list
      const moved = [...list]
      ;[moved[i], moved[j]] = [moved[j], moved[i]]
      return moved
    })
    focusSoon(`field-${key}-${step < 0 ? 'up' : 'down'}`, `field-${key}-label`)
  }
  // Pasted fields go after the ones already typed; untouched blank rows are dropped
  const addQuick = () => {
    edit((list) => {
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
  // Drag and drop ignores the input's `accept`, so the extension is checked here; the title defaults to the file name
  const pick = (f?: File) => {
    if (!f) return
    if (!/\.docx$/i.test(f.name))
      return setFileError('Chỉ nhận file Word (.docx).')
    setFileError(null)
    setFile(f)
    // Places chosen in the previous file mean nothing in this one; fields find theirs by name again
    const dropped = fields.filter((x) => x.anchor).length
    const note = dropped
      ? ` Đã bỏ vị trí của ${dropped} trường theo file trước; trường trùng tên tự tìm lại chỗ trong file này.`
      : ''
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
          (found.length
            ? `Tìm thấy ${found.length} chỗ trống, đã đưa vào Nhập nhanh để bạn kiểm tra.`
            : 'Không tìm thấy chỗ trống nào trong file; khai báo trường bên dưới.') +
            note
        )
      })
      .catch(() => {
        if (run === scanRun.current)
          setScan(
            'Không đọc được file để tìm chỗ trống; khai báo trường bên dưới.' +
              note
          )
      })
    if (!title.trim())
      setTitle(f.name.replace(/\.docx$/i, '').replace(/[-_]+/g, ' '))
  }
  // The control each problem points at
  const targetId = ({ target, field }: TemplateIssue) => {
    if (field === undefined) return `tpl-${target}`
    const key = fields[field].key
    return target === 'group' ? `group-${key}` : `field-${key}-${target}`
  }
  const bad = (id: string) =>
    tried && issues.some((issue) => targetId(issue) === id)
  const focusIssue = (issue: TemplateIssue) =>
    document.getElementById(targetId(issue))?.focus()

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
      <div className="flex items-center gap-2">
        <h1 className="text-h1">Tạo template</h1>
        <HelpTip label="Về trang tạo template">
          Khai báo các chỗ trống người dùng cần điền; file mẫu (.docx) là tùy
          chọn. Template mới chỉ hiện với người dùng sau khi bạn kích hoạt ở
          trang chi tiết. Nhập mã của một template đã có để lưu phiên bản mới
          cho template đó.
        </HelpTip>
      </div>

      <div
        className={cn(
          'mt-8 grid max-w-6xl gap-8 lg:items-start',
          file
            ? 'lg:grid-cols-2'
            : 'lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]'
        )}
      >
        <form
          noValidate
          className="min-w-0 space-y-6"
          // Enter in a text box must not save a half-done template; only the button saves
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement)
              e.preventDefault()
          }}
          onSubmit={(e) => {
            e.preventDefault()
            if (issues.length) {
              setTried(true)
              focusIssue(issues[0])
              return
            }
            setBusy(true)
            setError(null)
            create(file, input)
              .then((id) => {
                guard.allowNavigation.current = true
                navigate(`/knowledge/templates/${id}`)
              })
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false))
          }}
        >
          <section className="paper p-5 md:p-6" aria-labelledby="new-file">
            <h2 id="new-file" className="text-h2 flex items-center gap-2">
              File mẫu (tùy chọn)
              <HelpTip label="File mẫu">
                File Word có sẵn bố cục. Hệ thống tự tìm các chỗ trống trong
                file để bạn tạo trường; khi nhập liệu, người dùng thấy file này
                và gõ giá trị thẳng vào các chỗ trống.
              </HelpTip>
            </h2>
            {file ? (
              <div className="border-border rounded-control mt-4 flex items-center gap-3 border p-3 text-sm">
                <FileText size={18} aria-hidden="true" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-fg-strong truncate font-semibold">
                    {file.name}
                  </p>
                  <p className="text-fg-muted num text-caption">
                    {file.size < 1_048_576
                      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                      : `${(file.size / 1_048_576).toFixed(1)} MB`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label={`Bỏ file ${file.name}`}
                  className={iconBtn}
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
            <div className="flex flex-wrap gap-4">
              <Field label="Mã template" required>
                <input
                  id="tpl-code"
                  required
                  aria-invalid={bad('tpl-code')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="vd. 03/TNDN"
                  className={`${inputCls} num max-w-56`}
                />
              </Field>
              <Field
                label="Năm tính thuế"
                required
                hint="Người dùng chỉ soạn được hồ sơ của năm này từ phiên bản đang phát hành. Mẫu của năm mới thì lưu thành phiên bản mới rồi phát hành."
              >
                <input
                  id="tpl-taxYear"
                  required
                  type="number"
                  inputMode="numeric"
                  min={2000}
                  max={2100}
                  aria-invalid={bad('tpl-taxYear')}
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className={`${inputCls} num w-28`}
                />
              </Field>
            </div>
            {existing && (
              <p
                role="status"
                className="bg-warning-soft text-warning rounded-surface px-3 py-2 text-sm"
              >
                Đã có template mã {existing.code}: “{existing.title}”. Lưu với
                mã này sẽ{' '}
                {latest?.status === 'DRAFT'
                  ? `thay bản nháp v${nextVersion} chưa phát hành`
                  : `tạo bản nháp v${nextVersion}`}{' '}
                cho template đó, không tạo template mới.
                {existing.status === 'ACTIVE' &&
                  ` Người dùng vẫn dùng bản đang phát hành cho tới khi bạn phát hành v${nextVersion}.`}{' '}
                <Link
                  to={`/knowledge/templates/${existing.id}`}
                  className="font-semibold underline"
                >
                  Mở template này
                </Link>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <Field label="Tên template" required>
                <input
                  id="tpl-title"
                  required
                  aria-invalid={bad('tpl-title')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Nhóm" required>
                <select
                  id="tpl-category"
                  required
                  aria-invalid={bad('tpl-category')}
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
                className={areaCls}
              />
            </Field>
          </section>

          <section className="paper p-5 md:p-6" aria-labelledby="new-fields">
            <h2 id="new-fields" className="text-h2 flex items-center gap-2">
              Chỗ trống người dùng cần điền
              <HelpTip label="Chỗ trống người dùng cần điền">
                Mỗi chỗ trống trong file mẫu là một trường. Trường cùng nhóm
                hiện chung một khối trên form của người dùng, theo thứ tự ở đây.
                Đổi nhóm hoặc thêm gợi ý cho một trường trong phần Chi tiết của
                trường đó.
              </HelpTip>
            </h2>
            <datalist id="field-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <div className="mt-5 space-y-8">
              {sections.map((s) => {
                const keys = new Set(s.items.map((x) => x.f.key))
                const head = s.items[0].f
                const requiredCount = s.items.filter((x) => x.f.required).length
                return (
                  <div key={`g:${s.name}`}>
                    <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3">
                      {/* Renamed on leaving the box: every keystroke would otherwise regroup the list under the caret */}
                      <input
                        key={head.group}
                        id={`group-${head.key}`}
                        aria-label="Tên nhóm"
                        placeholder="Tên nhóm"
                        aria-invalid={bad(`group-${head.key}`)}
                        defaultValue={head.group}
                        onBlur={(e) => {
                          if (e.target.value !== head.group)
                            setGroupFields(keys, { group: e.target.value })
                        }}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && e.currentTarget.blur()
                        }
                        className={cn(
                          inputCls,
                          'min-w-40 flex-1 font-semibold'
                        )}
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={requiredCount === s.items.length}
                          ref={(el) => {
                            if (el)
                              el.indeterminate =
                                requiredCount > 0 &&
                                requiredCount < s.items.length
                          }}
                          onChange={(e) =>
                            setGroupFields(keys, {
                              required: e.target.checked,
                            })
                          }
                          className="accent-ink size-4"
                        />
                        Bắt buộc cả nhóm
                      </label>
                    </div>
                    <ol className="divide-border-subtle divide-y">
                      {s.items.map(({ f, i }, n) => (
                        <li
                          key={f.key}
                          role="group"
                          aria-label={`Trường ${i + 1}`}
                          onFocus={() => setFocusKey(f.key)}
                          className="py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="num text-fg-muted w-6 shrink-0 text-sm"
                            >
                              {i + 1}
                            </span>
                            <input
                              id={`field-${f.key}-label`}
                              aria-label={`Tên trường ${i + 1}`}
                              aria-invalid={bad(`field-${f.key}-label`)}
                              placeholder="Tên trường"
                              value={f.label}
                              onChange={(e) =>
                                update(f.key, { label: e.target.value })
                              }
                              className={cn(inputCls, 'min-w-36 flex-1')}
                            />
                            <select
                              aria-label={`Kiểu dữ liệu trường ${i + 1}`}
                              value={f.type}
                              onChange={(e) =>
                                update(f.key, {
                                  type: e.target.value as SchemaField['type'],
                                })
                              }
                              className={cn(inputCls, 'w-32')}
                            >
                              {Object.entries(FIELD_TYPE).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                )
                              )}
                            </select>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={f.required}
                                onChange={(e) =>
                                  update(f.key, { required: e.target.checked })
                                }
                                className="accent-ink size-4"
                              />
                              Bắt buộc
                            </label>
                            {file && blanks.length > 0 && (
                              <>
                                {/* A line break: the position and the row's buttons share the second line */}
                                <span
                                  aria-hidden="true"
                                  className="basis-full"
                                />
                                <label className="ml-8 flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                                  <span className="shrink-0">Vị trí</span>
                                  <select
                                    id={`field-${f.key}-anchor`}
                                    aria-invalid={bad(`field-${f.key}-anchor`)}
                                    value={String(
                                      blanks.findIndex(
                                        (b) =>
                                          b.anchor === input.fields[i].anchor
                                      )
                                    )}
                                    onChange={(e) =>
                                      update(f.key, {
                                        anchor:
                                          e.target.value === '-1'
                                            ? null
                                            : blanks[Number(e.target.value)]
                                                .anchor,
                                      })
                                    }
                                    className={cn(inputCls, 'min-w-0 flex-1')}
                                  >
                                    <option value="-1">
                                      Không có trên file
                                    </option>
                                    {blanks.map((b, bi) => (
                                      <option key={bi} value={bi}>
                                        {b.group} · {b.label}
                                        {/* Two fields on one blank would overwrite each other */}
                                        {input.fields.some(
                                          (x, j) =>
                                            j !== i && x.anchor === b.anchor
                                        )
                                          ? ' (đã gán)'
                                          : ''}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </>
                            )}
                            <div className="ml-auto flex">
                              <button
                                id={`field-${f.key}-up`}
                                type="button"
                                disabled={n === 0}
                                onClick={() => moveField(f.key, -1)}
                                aria-label={`Đưa trường ${i + 1} lên`}
                                className={iconBtn}
                              >
                                <ChevronUp size={16} aria-hidden="true" />
                              </button>
                              <button
                                id={`field-${f.key}-down`}
                                type="button"
                                disabled={n === s.items.length - 1}
                                onClick={() => moveField(f.key, 1)}
                                aria-label={`Đưa trường ${i + 1} xuống`}
                                className={iconBtn}
                              >
                                <ChevronDown size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-expanded={open === f.key}
                                aria-controls={`field-${f.key}-more`}
                                onClick={() =>
                                  setOpen(open === f.key ? null : f.key)
                                }
                                aria-label={`Chi tiết trường ${i + 1}`}
                                className={cn(
                                  iconBtn,
                                  open === f.key && 'bg-sunken'
                                )}
                              >
                                <SlidersHorizontal
                                  size={16}
                                  aria-hidden="true"
                                />
                              </button>
                              <button
                                type="button"
                                disabled={fields.length === 1}
                                onClick={() => removeField(f.key)}
                                aria-label={`Xóa trường ${i + 1}`}
                                className={iconBtn}
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          {open === f.key && (
                            <div
                              id={`field-${f.key}-more`}
                              className="mt-3 ml-8 grid gap-3 sm:grid-cols-2"
                            >
                              <Field label="Nhóm">
                                {/* Moved on leaving the box, like a group rename */}
                                <input
                                  key={f.group}
                                  list="field-groups"
                                  defaultValue={f.group}
                                  onBlur={(e) => {
                                    if (e.target.value !== f.group)
                                      update(f.key, { group: e.target.value })
                                  }}
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && e.currentTarget.blur()
                                  }
                                  className={inputCls}
                                />
                              </Field>
                              <Field label="Gợi ý cho người dùng">
                                <input
                                  value={f.hint}
                                  onChange={(e) =>
                                    update(f.key, { hint: e.target.value })
                                  }
                                  className={inputCls}
                                />
                              </Field>
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={() => addField(head.group)}
                      className="btn btn-ghost mt-1 px-2"
                    >
                      <Plus size={16} aria-hidden="true" />
                      Thêm trường vào nhóm
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                id="tpl-fields"
                type="button"
                onClick={() => addField('')}
                className="btn btn-press btn-secondary"
              >
                <Plus size={16} aria-hidden="true" />
                Thêm nhóm
              </button>
              <button
                type="button"
                aria-expanded={quick !== null}
                onClick={() => setQuick((q) => (q === null ? '' : null))}
                className="btn btn-press btn-secondary"
              >
                <ClipboardPaste size={16} aria-hidden="true" />
                Nhập nhanh
              </button>
            </div>
            {quick !== null && (
              <div className="mt-4">
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    Danh sách trường, mỗi dòng một trường
                    <HelpTip label="Cách nhập nhanh">
                      Mỗi dòng: Nhóm | Tên trường | Kiểu | *. Có thể dán thẳng
                      từ Excel (cột cách nhau bằng tab). Dòng chỉ có tên trường
                      dùng nhóm của dòng trước. Kiểu: chữ, đoạn văn, số tiền,
                      ngày, năm (bỏ trống là chữ). Dấu * là bắt buộc nhập.
                    </HelpTip>
                  </span>
                  <textarea
                    rows={8}
                    autoFocus
                    value={quick}
                    onChange={(e) => setQuick(e.target.value)}
                    placeholder={
                      'Thông tin chung | Tên doanh nghiệp | chữ | *\nThông tin chung | Mã số thuế | chữ | *\nKỳ tính thuế | Doanh thu | số tiền'
                    }
                    className={`${areaCls} num`}
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

          {/* The server keeps no release notes yet, so only demo data asks for them */}
          {isKnowledgeDemo && (
            <section
              className="paper p-5 md:p-6"
              aria-labelledby="new-changelog"
            >
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
                    className={areaCls}
                  />
                </Field>
              </div>
            </section>
          )}

          {tried && issues.length > 0 && (
            <div role="alert" className="text-danger text-sm">
              <p className="font-semibold">
                Chưa lưu được, còn {issues.length} mục cần sửa:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {issues.map((issue) => (
                  <li key={`${issue.target}:${issue.field ?? ''}`}>
                    <button
                      type="button"
                      onClick={() => focusIssue(issue)}
                      className="text-left underline underline-offset-2"
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          {/* Stays at the bottom of the screen while the field list scrolls */}
          <div className="bg-desk border-border sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t py-3">
            <button
              type="submit"
              disabled={busy}
              className="btn btn-press btn-primary"
            >
              {busy
                ? existing
                  ? 'Đang lưu…'
                  : 'Đang tạo…'
                : existing
                  ? `Lưu bản nháp v${nextVersion}`
                  : 'Tạo template'}
            </button>
            <Link
              to="/knowledge/templates"
              className="btn btn-press btn-secondary no-underline"
            >
              Hủy
            </Link>
            {issues.length > 0 && (
              <span className="text-fg-muted num ml-auto text-sm">
                Còn {issues.length} mục cần điền
              </span>
            )}
          </div>
        </form>

        <aside
          aria-labelledby="new-preview"
          className="paper min-w-0 p-5 md:p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="new-preview" className="text-h2">
              Xem trước
            </h2>
            <div className="flex flex-wrap items-center gap-1">
              <div
                className="flex gap-1"
                role="group"
                aria-label="Kiểu xem trước"
              >
                {(
                  [
                    ['form', 'Form'],
                    file
                      ? (['file', 'File mẫu'] as const)
                      : (['paper', 'Trang giấy'] as const),
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
              {shown === 'file' && (
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  className="btn btn-ghost px-3"
                >
                  <Maximize2 size={16} aria-hidden="true" />
                  Phóng to
                </button>
              )}
            </div>
          </div>
          <div className="mt-4">
            {shown === 'file' && file ? (
              <DocxPreview file={file} fills={fills} focusId={focusId} />
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

      {zoomed && file && (
        <Modal
          title={file.name}
          size="xl"
          onClose={() => setZoomed(false)}
          footer={
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="btn btn-press btn-secondary"
            >
              Đóng
            </button>
          }
        >
          <div className="mt-4">
            <DocxPreview file={file} fills={fills} focusId={focusId} />
          </div>
        </Modal>
      )}
      {guard.blocker.state === 'blocked' && (
        <Modal
          title="Rời trang khi chưa lưu?"
          description="Template chưa được lưu. Rời trang sẽ mất file mẫu và các trường đã khai báo."
          closeLabel="Ở lại"
          onClose={() => guard.blocker.reset?.()}
          footer={
            <>
              <button
                type="button"
                onClick={() => guard.blocker.reset?.()}
                className="btn btn-press btn-secondary"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => guard.blocker.proceed?.()}
                className="btn btn-press btn-primary"
              >
                Rời trang
              </button>
            </>
          }
        />
      )}
    </KnowledgeLayout>
  )
}
