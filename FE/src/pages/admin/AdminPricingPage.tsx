import { useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info, Plus } from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { useNavToast } from '@/hooks/useNavToast'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { usePricing } from '../../features/service-pricing/hooks/usePricing'
import { PackageDialog } from '../../features/service-pricing/components/PackageDialog'
import type {
  CreditPackage,
  PackageInput,
  PricingOverview,
} from '../../features/service-pricing/types'

const tabs = [
  {
    key: 'review-fee',
    label: 'Phí rà soát chuyên gia',
    intro: 'Expert đặt phí rà soát trong khung của từng nhóm mẫu biểu. Thay đổi chỉ áp dụng cho yêu cầu mới, từ ngày hiệu lực.',
  },
  {
    key: 'credit',
    label: 'Credit và gói nạp',
    intro: 'Đơn giá credit cho trợ lý AI và soạn nháp, và các gói nạp hiện trên paywall.',
  },
  {
    key: 'history',
    label: 'Lịch sử thay đổi',
    intro: 'Mọi thay đổi khung giá, đơn giá credit và gói nạp, mới nhất trước.',
  },
] as const
type Tab = (typeof tabs)[number]['key']

const vnd = (n: number) => n.toLocaleString('vi-VN')
const range = (min: number, max: number) => `${vnd(min)} – ${vnd(max)} đ`
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

const headCls = 'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'

export default function AdminPricingPage() {
  const nav = useAdminNav()
  const pricing = usePricing()
  const { data, isLoading, error } = pricing
  // Tab nằm trên URL (?tab=) để breadcrumb và link dẫn đúng tab
  const [params, setParams] = useSearchParams()
  const current = tabs.find((t) => t.key === params.get('tab')) ?? tabs[0]
  const tab = current.key
  const setTab = (key: Tab) => setParams(key === 'review-fee' ? {} : { tab: key })
  // Màn sửa khung chuyển về đây sau khi lên lịch, kèm { toast }
  const { toast, setToast, clearToast } = useNavToast()

  // Tab ARIA: mũi tên trái/phải, Home/End chuyển tab và chuyển focus theo
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === tab)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const key = tabs[(next + tabs.length) % tabs.length].key
    setTab(key)
    document.getElementById(`tab-${key}`)?.focus()
  }

  return (
    <AdminLayout
      {...nav}
      section="pricing"
      breadcrumb={
        tab === 'review-fee' ? (
          'Khung giá dịch vụ'
        ) : (
          <>
            <Link to="/admin/pricing" className="text-fg-muted hover:text-fg-strong">
              Khung giá dịch vụ
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-fg-strong" aria-current="page">
              {current.label}
            </span>
          </>
        )
      }
    >
      <h1 className="text-h1">Khung giá dịch vụ</h1>
      <p className="text-fg-muted mt-3">{current.intro}</p>

      <div
        role="tablist"
        aria-label="Cấu hình giá"
        onKeyDown={onTabKey}
        className="mt-8 flex gap-7 overflow-x-auto"
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-controls={`panel-${key}`}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            className={cn(
              'border-b-2 pb-2 whitespace-nowrap',
              tab === key
                ? 'border-indicator text-fg-strong font-semibold'
                : 'text-fg-muted border-transparent'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {!data ? (
          <p className="paper text-fg-muted px-4 py-10 text-center text-sm">
            {isLoading ? 'Đang tải…' : error?.message}
          </p>
        ) : tab === 'review-fee' ? (
          <ReviewFeeTab data={data} />
        ) : tab === 'credit' ? (
          <CreditTab
            data={data}
            onSave={(input) =>
              pricing
                .savePackage(input)
                .then(() => setToast(`Đã lưu ${input.name}`))
            }
          />
        ) : (
          <section className="paper">
            <ol className="divide-border-subtle divide-y">
              {data.history.map((h) => (
                <li key={h.at} className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[150px_120px_1fr]">
                  <span className="text-fg-muted num">{formatDateTime(h.at)}</span>
                  <span className="text-fg-strong font-semibold">{h.by}</span>
                  <span>{h.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}

function ReviewFeeTab({ data }: { data: PricingOverview }) {
  const scheduled = data.tiers.filter((t) => t.scheduled)

  return (
    <>
      <section className="bg-sunken rounded-surface flex flex-wrap items-center gap-x-10 gap-y-3 p-4">
        <dl className="flex gap-10">
          <div>
            <dt className="text-fg-muted text-sm">Phí nền tảng</dt>
            <dd className="text-fg-strong num text-2xl font-semibold">{data.platformShare}%</dd>
          </div>
          <div>
            <dt className="text-fg-muted text-sm">Chuyên gia nhận</dt>
            <dd className="text-fg-strong num text-2xl font-semibold">{data.expertShare}%</dd>
          </div>
        </dl>
        <p className="text-fg-muted max-w-[52ch] text-sm md:ml-auto">
          Tỷ lệ theo chính sách nền tảng, không chỉnh ở màn này. Client không
          thấy tỷ lệ chia; chỉ thấy phí rà soát chuyên gia đặt.
        </p>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-h2">Khung theo nhóm mẫu biểu</h2>
        <Link to="/admin/pricing/new" className="btn btn-press btn-secondary no-underline">
          <Plus size={16} aria-hidden="true" />
          Thêm nhóm mẫu biểu
        </Link>
      </div>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Nhóm mẫu biểu</th>
              <th className="text-left">Khung hiện hành</th>
              <th className="text-right">Bước giá</th>
              <th className="text-right">Expert đang nhận</th>
              <th className="text-right">Ngoài khung</th>
              <th className="text-right">Hiệu lực từ</th>
              <th>
                <span className="sr-only">Thay đổi đã lên lịch</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.tiers.map((t) => (
              <tr key={t.id} className={rowCls}>
                <td>
                  <Link
                    to={`/admin/pricing/${t.id}`}
                    className="text-fg-strong font-semibold underline underline-offset-4"
                  >
                    {t.group}
                  </Link>
                  <div className="text-fg-muted">
                    <span className="num">{t.templateCount}</span> mẫu
                  </div>
                </td>
                <td className="text-fg-strong num font-semibold whitespace-nowrap">
                  {range(t.min, t.max)}
                </td>
                <td className="num text-right">{vnd(t.step)}</td>
                <td className="num text-right">{t.expertsAccepting}</td>
                <td className={cn('num text-right', t.outsideRange > 0 && 'text-warning font-semibold')}>
                  {t.outsideRange}
                </td>
                <td className="num text-right">{formatDate(t.effectiveFrom)}</td>
                <td className="text-right">
                  {t.scheduled && (
                    <StatusBadge
                      status={{
                        label: `Có thay đổi từ ${dayMonth(t.scheduled.effectiveFrom)}`,
                        tone: 'warning',
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {scheduled.length > 0 && (
        <div className="bg-sunken rounded-surface mt-6 flex gap-2 p-3 text-sm">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="text-fg-strong font-semibold">
              <span className="num">{scheduled.length}</span> thay đổi đã lên lịch
            </p>
            {scheduled.map(({ id, group, scheduled: s }) => (
              <p key={id} className="text-fg-muted">
                {group}: <span className="num">{range(s!.min, s!.max)}</span> từ{' '}
                <span className="num">{formatDate(s!.effectiveFrom)}</span>, do {s!.by} tạo
                ngày <span className="num">{formatDate(s!.createdAt)}</span>. Có thể hủy
                trước ngày hiệu lực.
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* Tab "Credit và gói nạp": đơn giá từng thao tác + gói nạp bán qua PayOS */
function CreditTab({
  data,
  onSave,
}: {
  data: PricingOverview
  onSave: (input: PackageInput) => Promise<unknown>
}) {
  // Giá chưa chốt hoặc kèm điều kiện tô cam để Admin thấy còn phải xử lý
  const pending = 'text-accent-text font-semibold'
  // undefined = dialog đóng, null = thêm gói, CreditPackage = sửa gói đó
  const [editing, setEditing] = useState<CreditPackage | null>()
  return (
    <>
      <h2 className="text-h2">Đơn giá</h2>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Thao tác</th>
              <th className="text-left">Khi nào tính</th>
              <th className="text-right">Giá</th>
            </tr>
          </thead>
          <tbody>
            {data.creditRates.map((r) => (
              <tr key={r.id} className={rowCls}>
                <td className="text-fg-strong font-semibold">{r.action}</td>
                <td className="text-fg-muted">{r.when}</td>
                <td className="num text-right whitespace-nowrap">
                  {r.credits === null ? (
                    <span className={pending}>[chờ chốt]</span>
                  ) : r.note ? (
                    <span className={pending}>
                      {r.credits} · {r.note}
                    </span>
                  ) : (
                    <span className="text-fg-strong font-semibold">{r.credits} credit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-h2">Gói nạp qua PayOS</h2>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="btn btn-press btn-secondary"
        >
          <Plus size={16} aria-hidden="true" />
          Thêm gói
        </button>
      </div>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Gói</th>
              <th className="text-right">Số credit</th>
              <th className="text-right">Giá bán</th>
              <th className="text-left">Trạng thái</th>
              <th className="text-right">Thứ tự trên paywall</th>
            </tr>
          </thead>
          <tbody>
            {[...data.creditPackages]
              .sort((a, b) => a.order - b.order)
              .map((p) => (
                <tr key={p.id} className={rowCls}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label={`Sửa ${p.name}`}
                      className="text-fg-strong font-semibold underline underline-offset-4"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="num text-right">{p.credits}</td>
                  <td className="num text-right">
                    {p.price === null ? (
                      <span className={pending}>[giá gói]</span>
                    ) : (
                      `${vnd(p.price)} đ`
                    )}
                  </td>
                  <td className="text-fg-muted">
                    {p.onSale ? 'Đang bán' : 'Ngừng bán'}
                    {p.recommended && ' · gợi ý'}
                  </td>
                  <td className="num text-right">{p.order}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
      <p className="text-fg-muted mt-3 text-sm">
        Đổi giá gói chỉ áp dụng cho lần nạp mới; credit đã nạp giữ nguyên.
      </p>

      {editing !== undefined && (
        <PackageDialog
          key={editing?.id ?? 'new'}
          pkg={editing ?? undefined}
          nextOrder={Math.max(0, ...data.creditPackages.map((p) => p.order)) + 1}
          onClose={() => setEditing(undefined)}
          onSave={onSave}
        />
      )}
    </>
  )
}