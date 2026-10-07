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

/* Xem trước form người soạn nháp sẽ điền với một phiên bản template.
 * Dựng ngay trong màn quản lý: khu /drafts cần đăng nhập người dùng và không có dữ liệu phiên bản cũ. */
export function TemplatePreview({
  template,
  version,
  onClose,
}: {
  template: ManagedTemplate
  version: ManagedTemplateVersion
  onClose: () => void
}) {
  const groups = [...new Set(version.fields.map((f) => f.group))]
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
        <h3 className="text-fg-strong font-semibold">{template.title}</h3>
        {template.description && (
          <p className="text-fg-muted mt-1 text-sm">{template.description}</p>
        )}
        {version.fields.length === 0 ? (
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
              {version.fields
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
      </div>
    </Modal>
  )
}
