import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/feedback/modal'
import type { CreditPackage, PackageInput } from '../types'

interface PackageDialogProps {
  /** Có = sửa gói; không có = thêm gói mới */
  pkg?: CreditPackage
  /** Thứ tự mặc định cho gói mới (cuối danh sách) */
  nextOrder: number
  onClose: () => void
  /** Reject → giữ dialog, hiện lỗi */
  onSave: (input: PackageInput) => Promise<unknown>
}

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field(props: { label: string; hint?: string; suffix?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {props.label}
      <span className="flex items-center gap-2">
        {props.children}
        {props.suffix && <span className="text-fg-muted font-normal">{props.suffix}</span>}
      </span>
      {props.hint && <span className="text-fg-muted text-caption font-normal">{props.hint}</span>}
    </label>
  )
}

/* Dialog thêm/sửa gói nạp credit bán qua PayOS */
export function PackageDialog({ pkg, nextOrder, onClose, onSave }: PackageDialogProps) {
  const [name, setName] = useState(pkg?.name ?? '')
  const [credits, setCredits] = useState(pkg ? String(pkg.credits) : '')
  const [price, setPrice] = useState(pkg?.price != null ? String(pkg.price) : '')
  const [order, setOrder] = useState(String(pkg?.order ?? nextOrder))
  const [onSale, setOnSale] = useState(pkg?.onSale ?? true)
  const [recommended, setRecommended] = useState(pkg?.recommended ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const perCredit =
    price && Number(credits) > 0 ? Math.round(Number(price) / Number(credits)) : null

  return (
    <Modal
      title={pkg ? `Sửa ${pkg.name}` : 'Thêm gói nạp'}
      description="Gói hiện trên paywall khi đang bán. Đổi giá chỉ áp dụng cho lần nạp mới; credit đã nạp giữ nguyên."
      onClose={onClose}
      // `required`/`min` trên các ô đã chặn submit khi thiếu hoặc sai
      onSubmit={() => {
        setBusy(true)
        setError(null)
        onSave({
          id: pkg?.id,
          name: name.trim(),
          credits: Number(credits),
          price: price ? Number(price) : null,
          order: Number(order),
          onSale,
          recommended,
        })
          .then(onClose)
          .catch((e: Error) => {
            setBusy(false)
            setError(e.message)
          })
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-press btn-secondary">
            Hủy
          </button>
          <button type="submit" disabled={busy} className="btn btn-press btn-primary">
            {busy ? 'Đang lưu…' : pkg ? 'Lưu gói' : 'Thêm gói'}
          </button>
        </>
      }
    >
      <div className="mt-5 space-y-4">
        <Field label="Tên gói (bắt buộc)" hint="Tên Client thấy trên paywall.">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="vd. Gói 30"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số credit (bắt buộc)">
            <input
              required
              type="number"
              inputMode="numeric"
              min={1}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className={`${inputCls} num text-right`}
            />
          </Field>
          <Field
            label="Giá bán"
            suffix="đ"
            hint={
              perCredit
                ? `${perCredit.toLocaleString('vi-VN')} đ mỗi credit`
                : 'Bỏ trống nếu chưa chốt giá.'
            }
          >
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputCls} num text-right`}
            />
          </Field>
        </div>
        <Field label="Thứ tự trên paywall (bắt buộc)" hint="1 = hiện đầu tiên.">
          <input
            required
            type="number"
            inputMode="numeric"
            min={1}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className={`${inputCls} num text-right sm:max-w-32`}
          />
        </Field>

        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">Hiển thị trên paywall</legend>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={onSale}
              onChange={(e) => setOnSale(e.target.checked)}
              className="accent-ink mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="text-fg-strong block font-semibold">Đang bán</span>
              <span className="text-fg-muted">Tắt để ẩn khỏi paywall mà không xóa gói.</span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={recommended}
              onChange={(e) => setRecommended(e.target.checked)}
              className="accent-ink mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="text-fg-strong block font-semibold">Gợi ý trên paywall</span>
              <span className="text-fg-muted">Đánh dấu gói nên chọn; nên chỉ có một gói gợi ý.</span>
            </span>
          </label>
        </fieldset>

        {!price && (
          <p className="bg-warning-soft text-warning rounded-surface p-3 text-sm">
            Gói chưa có giá sẽ không bán được dù đang bật. Paywall chỉ hiện gói có giá.
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
