import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/feedback/modal'
import { SOURCE_STATUS } from '../constants'
import type { CollectionSource, SourceInput } from '../types'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {hint && (
        <span className="text-fg-muted text-caption font-normal">{hint}</span>
      )}
      {error && (
        <span role="alert" className="text-danger text-caption font-normal">
          {error}
        </span>
      )}
    </label>
  )
}

const isHttpUrl = (v: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}

/* Thêm nguồn (source = undefined) hoặc sửa nguồn có sẵn. Lỗi hiện khi bấm Lưu, không hiện lúc đang gõ */
export function SourceDialog({
  source,
  onSave,
  onClose,
}: {
  source?: CollectionSource
  onSave: (input: SourceInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(source?.name ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const [scope, setScope] = useState(source?.scope ?? '')
  const [status, setStatus] = useState<CollectionSource['status']>(
    source?.status ?? 'ACTIVE'
  )
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errors = {
    name: name.trim() ? undefined : 'Nhập tên nguồn.',
    url: isHttpUrl(url.trim())
      ? undefined
      : 'Nhập địa chỉ bắt đầu bằng http:// hoặc https://',
  }
  const valid = !errors.name && !errors.url

  return (
    <Modal
      title={source ? 'Sửa nguồn' : 'Thêm nguồn'}
      description="Nguồn đang dùng được thu thập theo lịch ở trên. Văn bản mới hoặc có thay đổi vào hàng đợi duyệt."
      onClose={onClose}
      preventClose={busy}
      onSubmit={() => {
        setTried(true)
        if (!valid) return
        setBusy(true)
        setError(null)
        onSave({
          name: name.trim(),
          url: url.trim(),
          scope: scope.trim() || null,
          status,
        })
          .then(onClose)
          .catch((e: Error) => setError(e.message))
          .finally(() => setBusy(false))
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-press btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-press btn-primary"
          >
            {busy ? 'Đang lưu…' : source ? 'Lưu thay đổi' : 'Thêm nguồn'}
          </button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <Field label="Tên nguồn" error={tried ? errors.name : undefined}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field
          label="Địa chỉ"
          hint="Trang danh sách văn bản cần thu thập."
          error={tried ? errors.url : undefined}
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field
          label="Phạm vi thu thập"
          hint="Từ khóa hoặc mục cần lấy, vd. “Từ khóa: thuế TNDN”. Bỏ trống thì lấy tất cả."
        >
          <input
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={inputCls}
          />
        </Field>
        <fieldset className="text-sm">
          <legend className="font-semibold">Trạng thái</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {(Object.keys(SOURCE_STATUS) as CollectionSource['status'][]).map(
              (s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="source-status"
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="accent-ink size-4"
                  />
                  {SOURCE_STATUS[s].label}
                </label>
              )
            )}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
