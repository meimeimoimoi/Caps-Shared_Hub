import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { usePricing } from '../../features/service-pricing/hooks/usePricing'
import type {
  PriceTier,
  TierChangeInput,
} from '../../features/service-pricing/types'

const vnd = (n: number) => n.toLocaleString('vi-VN')
/** yyyy-mm-dd theo giờ máy (định dạng sv-SE đúng là ISO ngày) cho <input type="date"> */
const isoDay = (d: Date) => d.toLocaleDateString('sv-SE')

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

export default function AdminPricingTierPage() {
  const { id = '' } = useParams()
  const nav = useAdminNav()
  const pricing = usePricing()
  // /admin/pricing/new = thêm nhóm mẫu biểu, dùng chung form với màn sửa khung
  const isNew = id === 'new'
  const tier = pricing.data?.tiers.find((t) => t.id === id)
  const title = isNew ? 'Thêm nhóm mẫu biểu' : tier?.group

  const listLink = (
    <Link to="/admin/pricing" className="text-fg-muted hover:text-fg-strong">
      Khung giá dịch vụ
    </Link>
  )

  return (
    <AdminLayout
      {...nav}
      section="pricing"
      breadcrumb={
        <>
          {listLink}
          {title && (
            <>
              {' '}
              <span aria-hidden="true">/</span>{' '}
              <span className="text-fg-strong" aria-current="page">
                {title}
              </span>
            </>
          )}
        </>
      }
    >
      {pricing.data && (isNew || tier) ? (
        <TierForm
          tier={tier}
          expertShare={pricing.data.expertShare}
          onSubmit={({ group, ...input }) =>
            tier ? pricing.schedule(tier.id, input) : pricing.createTier({ ...input, group })
          }
        />
      ) : (
        <h1 className="text-h1-tool">
          {pricing.isLoading
            ? 'Đang tải…'
            : (pricing.error?.message ?? `Không tìm thấy nhóm mẫu biểu ${id}`)}
        </h1>
      )}
    </AdminLayout>
  )
}

/* Form khung giá. Có tier = sửa (khởi tạo từ lịch đang chờ nếu có); không có = thêm nhóm mới */
function TierForm({
  tier,
  expertShare,
  onSubmit,
}: {
  tier?: PriceTier
  expertShare: number
  onSubmit: (input: TierChangeInput & { group: string }) => Promise<unknown>
}) {
  const navigate = useNavigate()
  const base = tier?.scheduled ?? tier
  const [tomorrow] = useState(() => isoDay(new Date(Date.now() + 86_400_000)))
  const [group, setGroup] = useState('')
  const [min, setMin] = useState(base ? String(base.min) : '')
  const [max, setMax] = useState(base ? String(base.max) : '')
  const [step, setStep] = useState(String(tier?.step ?? 100_000))
  const [effectiveFrom, setEffectiveFrom] = useState(
    tier?.scheduled ? isoDay(new Date(tier.scheduled.effectiveFrom)) : tomorrow
  )
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lo = Number(min)
  const hi = Number(max)
  const st = Number(step)
  // Ai rơi ra ngoài khung mới, tính lại mỗi lần gõ
  const outside = tier?.experts.filter((e) => e.fee < lo || e.fee > hi) ?? []

  const blockers = [
    !tier && !group.trim() && { text: 'Thiếu tên nhóm mẫu biểu' },
    (!lo || !hi) && { text: 'Nhập đủ mức tối thiểu và tối đa' },
    lo && hi && lo >= hi && { text: 'Mức tối thiểu phải nhỏ hơn mức tối đa' },
    (st <= 0 || lo % st !== 0 || hi % st !== 0) && {
      text: 'Mức giá phải chia hết cho bước giá',
    },
    (!effectiveFrom || effectiveFrom < tomorrow) && { text: 'Hiệu lực phải từ ngày mai trở đi' },
    !reason.trim() && { text: 'Thiếu lý do thay đổi' },
  ].filter((b) => !!b)

  return (
    <>
      <h1 className="text-h1">{tier ? tier.group : 'Thêm nhóm mẫu biểu'}</h1>
      <p className="text-fg-muted mt-2 text-sm">
        {tier ? (
          <>
            Đang áp dụng:{' '}
            <strong className="text-fg-strong num">
              {vnd(tier.min)} – {vnd(tier.max)} đ
            </strong>
            , bước <span className="num">{vnd(tier.step)}</span>, từ{' '}
            <span className="num">{formatDate(tier.effectiveFrom)}</span>
          </>
        ) : (
          'Expert nhận nhóm này sẽ đặt phí rà soát trong khung bạn tạo, từ ngày hiệu lực.'
        )}
      </p>

      <div className="mt-8 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="paper p-5 md:p-6">
          <h2 className="text-h2">{tier ? 'Khung mới' : 'Khung giá'}</h2>
          {!tier && (
            <div className="mt-4">
              <Field
                label="Tên nhóm mẫu biểu (bắt buộc)"
                hint="Tên Client thấy khi chọn loại hồ sơ cần rà soát."
              >
                <input
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="vd. Chuyển giá liên kết"
                  className={inputCls}
                />
              </Field>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Phí tối thiểu (bắt buộc)" suffix="đ">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={st || undefined}
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className={`${inputCls} num text-right`}
              />
            </Field>
            <Field label="Phí tối đa (bắt buộc)" suffix="đ">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={st || undefined}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className={`${inputCls} num text-right`}
              />
            </Field>
            <Field
              label="Bước giá (bắt buộc)"
              suffix="đ"
              hint="Expert chỉ đặt được bội số của bước giá."
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={step}
                onChange={(e) => setStep(e.target.value)}
                className={`${inputCls} num text-right`}
              />
            </Field>
            <Field label="Hiệu lực từ (bắt buộc)" hint="Sớm nhất là ngày mai.">
              <input
                type="date"
                min={tomorrow}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold">
            {tier ? 'Lý do thay đổi (bắt buộc)' : 'Lý do tạo nhóm (bắt buộc)'}
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                tier
                  ? 'vd. Hồ sơ hoàn thuế thường cần đối chiếu nhiều kỳ'
                  : 'vd. Thêm mẫu biểu chuyển giá theo Nghị định 132/2020'
              }
              className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
            />
            <span className="text-fg-muted text-caption font-normal">
              Lưu vào lịch sử thay đổi và gửi kèm thông báo cho Expert.
            </span>
          </label>

          <div className="bg-sunken rounded-surface mt-5 p-3 text-sm">
            <p className="text-fg-strong font-semibold">Expert sẽ thấy khi đặt giá</p>
            <p className="mt-1">
              Khung hiện hành:{' '}
              <strong className="num">
                {lo ? vnd(lo) : '…'} – {hi ? vnd(hi) : '…'} đ
              </strong>{' '}
              · bạn nhận <span className="num">{expertShare}%</span>
            </p>
          </div>
        </section>

        {!tier ? (
          <section className="paper p-5">
            <h2 className="text-h2">Sau khi tạo</h2>
            <Note title="Nhóm mới chưa có Expert nào nhận">
              Từ ngày hiệu lực, Expert thấy nhóm này trong mục Dịch vụ và tự bật
              nhận nếu muốn, với giá trong khung.
            </Note>
            <Note title="Client chỉ thấy khi có Expert nhận">
              Nhóm hiện trên Marketplace khi có ít nhất một Expert đang hoạt động
              nhận nhóm này.
            </Note>
          </section>
        ) : (
        <section className="paper p-5">
          <h2 className="text-h2">Ảnh hưởng</h2>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              [tier.expertsAccepting, 'Expert trong nhóm', ''],
              [outside.length, 'Ngoài khung mới', outside.length ? 'text-warning' : ''],
              [tier.activeCases, 'Case đang chạy', ''],
            ].map(([n, label, cls]) => (
              <div key={label as string}>
                <dd className={`text-fg-strong num text-2xl font-semibold ${cls}`}>{n}</dd>
                <dt className="text-fg-muted text-caption">{label}</dt>
              </div>
            ))}
          </dl>

          {outside.length > 0 && (
            <>
              <p className="eyebrow mt-4">Ngoài khung mới</p>
              <ul className="divide-border-subtle mt-1 divide-y text-sm">
                {outside.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 py-2">
                    <span>
                      <span className="text-fg-strong block font-semibold">{e.name}</span>
                      <span className="text-warning text-caption">
                        {e.fee < lo ? 'dưới mức tối thiểu mới' : 'trên mức tối đa mới'}
                      </span>
                    </span>
                    <span className="num">{vnd(e.fee)} đ</span>
                  </li>
                ))}
              </ul>
              <Note title="Expert ngoài khung giữ giá cũ cho tới khi tự sửa">
                Hệ thống gửi thông báo đề nghị cập nhật. Họ vẫn hiện trên
                Marketplace với giá hiện tại.
              </Note>
            </>
          )}
          {tier.activeCases > 0 && (
            <Note title={`${tier.activeCases} case đang chạy không đổi giá`}>
              Case đã thanh toán giữ đúng số tiền đã trả.
            </Note>
          )}
        </section>
        )}
      </div>

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
      <DecisionBar
        className="-mx-4 mt-12 -mb-12 md:-mx-6 lg:-mx-8"
        blockers={blockers}
        ready={
          tier
            ? `Áp dụng cho yêu cầu mới từ ${formatDate(effectiveFrom)} · gửi thông báo cho ${tier.expertsAccepting} Expert`
            : `Mở cho Expert đặt giá từ ${formatDate(effectiveFrom)}`
        }
        secondary={
          <Link to="/admin/pricing" className="btn btn-press btn-secondary no-underline">
            Hủy
          </Link>
        }
        primary={{
          label: busy ? 'Đang lưu…' : tier ? 'Lên lịch áp dụng' : 'Tạo nhóm',
          disabled: blockers.length > 0 || busy,
          onClick: () => {
            setBusy(true)
            setError(null)
            const name = tier?.group ?? group.trim()
            onSubmit({ group: name, min: lo, max: hi, step: st, effectiveFrom, reason: reason.trim() })
              .then(() =>
                navigate('/admin/pricing', {
                  state: {
                    toast: tier
                      ? `Đã lên lịch khung mới cho ${name} từ ${formatDate(effectiveFrom)}`
                      : `Đã tạo nhóm ${name}, mở từ ${formatDate(effectiveFrom)}`,
                  },
                })
              )
              .catch((e: Error) => {
                setBusy(false)
                setError(e.message)
              })
          },
        }}
      />
    </>
  )
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-sunken rounded-surface mt-4 flex gap-2 p-3 text-sm">
      <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div>
        <p className="text-fg-strong font-semibold">{title}</p>
        <p className="text-fg-muted">{children}</p>
      </div>
    </div>
  )
}
