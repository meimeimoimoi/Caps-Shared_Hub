import { useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

// Nhãn/giới thiệu tab lấy từ i18n theo key: pricing.tabs.<key>.label / .intro
const tabs = [
  { key: 'review-fee' },
  { key: 'credit' },
  { key: 'history' },
] as const
type Tab = (typeof tabs)[number]['key']

const vnd = (n: number) => n.toLocaleString('vi-VN')
const range = (min: number, max: number) => `${vnd(min)} – ${vnd(max)} đ`
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  })

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'

export default function AdminPricingPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const pricing = usePricing()
  const { data, isLoading, error } = pricing
  // Tab nằm trên URL (?tab=) để breadcrumb và link dẫn đúng tab
  const [params, setParams] = useSearchParams()
  const current = tabs.find((x) => x.key === params.get('tab')) ?? tabs[0]
  const tab = current.key
  const setTab = (key: Tab) =>
    setParams(key === 'review-fee' ? {} : { tab: key })
  // Màn sửa khung chuyển về đây sau khi lên lịch, kèm { toast }
  const { toast, setToast, clearToast } = useNavToast()

  // Tab ARIA: mũi tên trái/phải, Home/End chuyển tab và chuyển focus theo
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((x) => x.key === tab)
    const next = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    }[e.key]
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
          t('pricing.title')
        ) : (
          <>
            <Link
              to="/admin/pricing"
              className="text-fg-muted hover:text-fg-strong"
            >
              {t('pricing.title')}
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-fg-strong" aria-current="page">
              {t(`pricing.tabs.${tab}.label`)}
            </span>
          </>
        )
      }
    >
      <h1 className="text-h1">{t('pricing.title')}</h1>
      <p className="text-fg-muted mt-3">{t(`pricing.tabs.${tab}.intro`)}</p>

      <div
        role="tablist"
        aria-label={t('pricing.tabsLabel')}
        onKeyDown={onTabKey}
        className="mt-8 flex gap-7 overflow-x-auto"
      >
        {tabs.map(({ key }) => (
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
            {t(`pricing.tabs.${key}.label`)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-6"
      >
        {!data ? (
          isLoading ? (
            // Khung xương cỡ bảng khung giá để trang không giật khi dữ liệu về
            <div role="status" className="paper h-72 motion-safe:animate-pulse">
              <span className="sr-only">{t('common:loading')}</span>
            </div>
          ) : (
            <p className="paper text-fg-muted px-4 py-10 text-center text-sm">
              {error?.message}
            </p>
          )
        ) : tab === 'review-fee' ? (
          <ReviewFeeTab data={data} />
        ) : tab === 'credit' ? (
          <CreditTab
            data={data}
            onSave={(input) =>
              pricing
                .savePackage(input)
                .then(() => setToast(t('pricing.saved', { name: input.name })))
            }
          />
        ) : (
          <section className="paper">
            <ol className="divide-border-subtle divide-y">
              {data.history.map((h) => (
                <li
                  key={h.at}
                  className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[150px_120px_1fr]"
                >
                  <span className="text-fg-muted num">
                    {formatDateTime(h.at)}
                  </span>
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
  const { t } = useTranslation('admin')
  const scheduled = data.tiers.filter((x) => x.scheduled)

  return (
    <>
      <section className="bg-sunken rounded-surface flex flex-wrap items-center gap-x-10 gap-y-3 p-4">
        <dl className="flex gap-10">
          <div>
            <dt className="text-fg-muted text-sm">
              {t('pricing.share.platform')}
            </dt>
            <dd className="text-fg-strong num text-2xl font-semibold">
              {data.platformShare}%
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted text-sm">
              {t('pricing.share.expert')}
            </dt>
            <dd className="text-fg-strong num text-2xl font-semibold">
              {data.expertShare}%
            </dd>
          </div>
        </dl>
        <p className="text-fg-muted max-w-[52ch] text-sm md:ml-auto">
          {t('pricing.share.note')}
        </p>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-h2">{t('pricing.tiers.title')}</h2>
        <Link
          to="/admin/pricing/new"
          className="btn btn-press btn-secondary no-underline"
        >
          <Plus size={16} aria-hidden="true" />
          {t('pricing.tiers.add')}
        </Link>
      </div>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('pricing.tiers.col.group')}</th>
              <th className="text-left">{t('pricing.tiers.col.range')}</th>
              <th className="text-right">{t('pricing.tiers.col.step')}</th>
              <th className="text-right">{t('pricing.tiers.col.accepting')}</th>
              <th className="text-right">{t('pricing.tiers.col.outside')}</th>
              <th className="text-right">{t('pricing.tiers.col.from')}</th>
              <th>
                <span className="sr-only">
                  {t('pricing.tiers.col.scheduled')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.tiers.map((tier) => (
              <tr key={tier.id} className={rowCls}>
                <td>
                  <Link
                    to={`/admin/pricing/${tier.id}`}
                    className="text-fg-strong font-semibold underline underline-offset-4"
                  >
                    {tier.group}
                  </Link>
                  <div className="text-fg-muted">
                    {t('pricing.tiers.templates', {
                      count: tier.templateCount,
                    })}
                  </div>
                </td>
                <td className="text-fg-strong num font-semibold whitespace-nowrap">
                  {range(tier.min, tier.max)}
                </td>
                <td className="num text-right">{vnd(tier.step)}</td>
                <td className="num text-right">{tier.expertsAccepting}</td>
                <td
                  className={cn(
                    'num text-right',
                    tier.outsideRange > 0 && 'text-warning font-semibold'
                  )}
                >
                  {tier.outsideRange}
                </td>
                <td className="num text-right">
                  {formatDate(tier.effectiveFrom)}
                </td>
                <td className="text-right">
                  {tier.scheduled && (
                    <StatusBadge
                      status={{
                        label: t('pricing.tiers.changeFrom', {
                          date: dayMonth(tier.scheduled.effectiveFrom),
                        }),
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
              {t('pricing.tiers.scheduledCount', { count: scheduled.length })}
            </p>
            {scheduled.map(({ id, group, scheduled: s }) => (
              <p key={id} className="text-fg-muted">
                {t('pricing.tiers.scheduledLine', {
                  group,
                  range: range(s!.min, s!.max),
                  from: formatDate(s!.effectiveFrom),
                  by: s!.by,
                  created: formatDate(s!.createdAt),
                })}
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
  const { t } = useTranslation('admin')
  // Giá chưa chốt hoặc kèm điều kiện tô cam để Admin thấy còn phải xử lý
  const pending = 'text-accent-text font-semibold'
  // undefined = dialog đóng, null = thêm gói, CreditPackage = sửa gói đó
  const [editing, setEditing] = useState<CreditPackage | null>()
  return (
    <>
      <h2 className="text-h2">{t('pricing.credit.rates')}</h2>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('pricing.credit.col.action')}</th>
              <th className="text-left">{t('pricing.credit.col.when')}</th>
              <th className="text-right">{t('pricing.credit.col.price')}</th>
            </tr>
          </thead>
          <tbody>
            {data.creditRates.map((r) => (
              <tr key={r.id} className={rowCls}>
                <td className="text-fg-strong font-semibold">{r.action}</td>
                <td className="text-fg-muted">{r.when}</td>
                <td className="num text-right whitespace-nowrap">
                  {r.credits === null ? (
                    <span className={pending}>
                      {t('pricing.credit.pendingRate')}
                    </span>
                  ) : r.note ? (
                    <span className={pending}>
                      {r.credits} · {r.note}
                    </span>
                  ) : (
                    <span className="text-fg-strong font-semibold">
                      {t('pricing.credit.credits', { count: r.credits })}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-h2">{t('pricing.credit.packages')}</h2>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="btn btn-press btn-secondary"
        >
          <Plus size={16} aria-hidden="true" />
          {t('pricing.credit.addPackage')}
        </button>
      </div>
      <section className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('pricing.credit.pcol.name')}</th>
              <th className="text-right">{t('pricing.credit.pcol.credits')}</th>
              <th className="text-right">{t('pricing.credit.pcol.price')}</th>
              <th className="text-left">{t('pricing.credit.pcol.status')}</th>
              <th className="text-right">{t('pricing.credit.pcol.order')}</th>
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
                      aria-label={t('pricing.credit.editLabel', {
                        name: p.name,
                      })}
                      className="text-fg-strong font-semibold underline underline-offset-4"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="num text-right">{p.credits}</td>
                  <td className="num text-right">
                    {p.price === null ? (
                      <span className={pending}>
                        {t('pricing.credit.pendingPrice')}
                      </span>
                    ) : (
                      `${vnd(p.price)} đ`
                    )}
                  </td>
                  <td className="text-fg-muted">
                    {p.onSale
                      ? t('pricing.credit.onSale')
                      : t('pricing.credit.offSale')}
                    {p.recommended && t('pricing.credit.recommended')}
                  </td>
                  <td className="num text-right">{p.order}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
      <p className="text-fg-muted mt-3 text-sm">{t('pricing.credit.note')}</p>

      {editing !== undefined && (
        <PackageDialog
          key={editing?.id ?? 'new'}
          pkg={editing ?? undefined}
          nextOrder={
            Math.max(0, ...data.creditPackages.map((p) => p.order)) + 1
          }
          onClose={() => setEditing(undefined)}
          onSave={onSave}
        />
      )}
    </>
  )
}
