import type { SchemaField } from '@/features/drafting/types'
import { Modal } from '@/components/ui/feedback/modal'
import type { ManagedTemplate, ManagedTemplateVersion } from '../types'

const inputCls =
  'border-border-control rounded-control bg-sunken h-control w-full border px-3 text-base font-normal'

// Ô nhập đúng kiểu người dùng sẽ gặp; chỉ để xem nên khóa lại
function PreviewInput({ field }: { field: SchemaField }) {
  if (field.type === 'textarea')
    return <textarea disabled rows={3} className={`${inputCls} h-auto py-2`} />
  if (field.type === 'date')
    return <input disabled type="date" className={inputCls} />
  return (
    <input
      disabled
      inputMode={field.type === 'text' ? undefined : 'numeric'}
      placeholder={
        field.type === 'money'
          ? '0 ₫'
          : field.type === 'year'
            ? 'vd. 2025'
            : undefined
      }
      className={inputCls}
    />
  )
}

/** The form a drafter fills with these fields; shared by the version preview dialog and the live preview while creating */
export function TemplateFormPreview({
  title,
  description,
  fields,
}: {
  title: string
  description?: string
  fields: SchemaField[]
}) {
  const groups = [...new Set(fields.map((f) => f.group))]
  return (
    <>
      <h3 className="text-fg-strong font-semibold">{title}</h3>
      {description && (
        <p className="text-fg-muted mt-1 text-sm">{description}</p>
      )}
      {fields.length === 0 ? (
        <p className="text-fg-muted mt-4 text-sm">
          Phiên bản này chưa có trường nhập, người dùng chỉ xem được để tham
          khảo.
        </p>
      ) : (
        groups.map((group) => (
          <fieldset key={group} className="mt-5 space-y-3">
            <legend className="text-fg-muted text-sm font-semibold">
              {group}
            </legend>
            {fields
              .filter((f) => f.group === group)
              .map((f) => (
                <label
                  key={f.id}
                  className="flex flex-col gap-1.5 text-sm font-semibold"
                >
                  <span>
                    {f.label}
                    {f.required && <span className="text-danger"> *</span>}
                  </span>
                  <PreviewInput field={f} />
                  {f.hint && (
                    <span className="text-fg-muted text-caption font-normal">
                      {f.hint}
                    </span>
                  )}
                </label>
              ))}
          </fieldset>
        ))
      )}
    </>
  )
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * The fields laid out as a printed A4 form, one numbered section per group and a dotted line per blank.
 * Built from the fields alone: the real .docx layout is not rendered. `print-sheet` keeps only this page when printing.
 */
export function TemplatePaperPreview({
  code,
  title,
  fields,
}: {
  code?: string
  title: string
  fields: SchemaField[]
}) {
  const groups = [...new Set(fields.map((f) => f.group))]
  return (
    <div className="print-sheet mx-auto aspect-[210/297] w-full max-w-[42rem] overflow-hidden bg-white p-[8%] font-serif text-[13px] leading-relaxed text-black shadow-md ring-1 ring-black/10">
      {code && <p className="text-right text-xs">Mẫu số: {code}</p>}
      <h3 className="mt-6 text-center text-base font-bold uppercase">
        {title}
      </h3>
      {groups.map((group, i) => (
        <section key={group} className="mt-5">
          <h4 className="font-bold">
            {ROMAN[i] ?? i + 1}. {group}
          </h4>
          {fields
            .filter((f) => f.group === group)
            .map((f) => (
              <div key={f.id} className="mt-2">
                <p className="flex items-end gap-1">
                  <span className="shrink-0">
                    {f.label}
                    {f.required && <span aria-label="bắt buộc">*</span>}:
                  </span>
                  <span
                    aria-hidden="true"
                    className="min-w-8 flex-1 border-b border-dotted border-black/60"
                  />
                </p>
                {f.type === 'textarea' && (
                  <p
                    aria-hidden="true"
                    className="h-5 border-b border-dotted border-black/60"
                  />
                )}
              </div>
            ))}
        </section>
      ))}
    </div>
  )
}

/* Previews the form a drafter fills with one template version.
 * Built inside the admin screen: /drafts needs a signed-in user and has no data for older versions. */
export function TemplatePreview({
  template,
  version,
  onClose,
}: {
  template: ManagedTemplate
  version: ManagedTemplateVersion
  onClose: () => void
}) {
  const notice =
    template.status !== 'ACTIVE'
      ? 'Template đang tạm ngưng: người dùng chưa chọn được mẫu này.'
      : version !== template.versions[0]
        ? `Đây là phiên bản cũ v${version.version}: chỉ bản nháp đã tạo trước đó còn dùng.`
        : null

  return (
    <Modal
      title={`Xem trước · v${version.version}`}
      description="Form người dùng điền khi soạn nháp bằng template này."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="btn btn-press btn-secondary"
        >
          Đóng
        </button>
      }
    >
      <div className="mt-4">
        {notice && (
          <p className="bg-warning-soft text-warning rounded-surface mb-4 px-3 py-2 text-sm">
            {notice}
          </p>
        )}
        <TemplateFormPreview
          title={template.title}
          description={template.description}
          fields={version.fields}
        />
      </div>
    </Modal>
  )
}
