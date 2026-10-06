import { useState, type KeyboardEvent } from 'react'
import { Info } from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { usePricing } from '../../features/service-pricing/hooks/usePricing'
import type { PricingOverview } from '../../features/service-pricing/types'

const tabs = [
  { key: 'review-fee', label: 'Phí rà soát chuyên gia' },
  { key: 'credit', label: 'Credit và gói nạp' },
  { key: 'history', label: 'Lịch sử thay đổi' },
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
  const { data, isLoading, error } = usePricing()
  const [tab, setTab] = useState<Tab>('review-fee')

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
    <AdminLayout {...nav} section="pricing" breadcrumb="Khung giá dịch vụ">
      <h1 className="text-h1">Khung giá dịch vụ</h1>
      <p className="text-fg-muted mt-3">
        Expert đặt phí rà soát trong khung của từng nhóm mẫu biểu. Thay đổi chỉ
        áp dụng cho yêu cầu mới, từ ngày hiệu lực.
      </p>

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
          <section className="paper overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className={headCls}>
                  <th className="text-left">Gói</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Giá</th>
                  <th className="text-right">Giá mỗi credit</th>
                </tr>
              </thead>
              <tbody>
                {data.creditPackages.map((p) => (
                  <tr key={p.id} className={rowCls}>
                    <td className="text-fg-strong font-semibold">{p.name}</td>
                    <td className="num text-right">{p.credits}</td>
                    <td className="num text-right">{vnd(p.price)} đ</td>
                    <td className="num text-fg-muted text-right">
                      {vnd(Math.round(p.price / p.credits))} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
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

      <section className="paper mt-6 overflow-x-auto">
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
                  <div className="text-fg-strong font-semibold">{t.group}</div>
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
