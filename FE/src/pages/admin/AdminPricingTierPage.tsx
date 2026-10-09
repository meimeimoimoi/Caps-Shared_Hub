import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function Field(props: {
  label: string
  hint?: string
  suffix?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {props.label}
      <span className="flex items-center gap-2">
        {props.children}
        {props.suffix && (
          <span className="text-fg-muted font-normal">{props.suffix}</span>
        )}
      </span>
      {props.hint && (
        <span className="text-fg-muted text-caption font-normal">
          {props.hint}
        </span>
      )}
    </label>
  )
}

export default function AdminPricingTierPage() {
  const { id = '' } = useParams()
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const pricing = usePricing()
  // /admin/pricing/new = thêm nhóm mẫu biểu, dùng chung form với màn sửa khung
  const isNew = id === 'new'
  const tier = pricing.data?.tiers.find((x) => x.id === id)
  const title = isNew ? t('pricing.tier.new') : tier?.group

  const listLink = (
    <Link to="/admin/pricing" className="text-fg-muted hover:text-fg-strong">
      {t('pricing.title')}
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
            tier
              ? pricing.schedule(tier.id, input)
              : pricing.createTier({ ...input, group })
          }
        />
      ) : (
        <h1 className="text-h1-tool">
          {pricing.isLoading
            ? t('common:loading')
            : (pricing.error?.message ?? t('pricing.tier.notFound', { id }))}
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
  const { t } = useTranslation('admin')
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
    !tier && !group.trim() && { text: t('pricing.tier.blocker.group') },
    (!lo || !hi) && { text: t('pricing.tier.blocker.bounds') },
    lo && hi && lo >= hi && { text: t('pricing.tier.blocker.order') },
    (st <= 0 || lo % st !== 0 || hi % st !== 0) && {
      text: t('pricing.tier.blocker.step'),
    },
    (!effectiveFrom || effectiveFrom < tomorrow) && {
      text: t('pricing.tier.blocker.date'),
    },
    !reason.trim() && { text: t('pricing.tier.blocker.reason') },
  ].filter((b) => !!b)

  return (
    <>
      <h1 className="text-h1">{tier ? tier.group : t('pricing.tier.new')}</h1>
      <p className="text-fg-muted mt-2 text-sm">
        {tier ? (
          <span className="num">
            {t('pricing.tier.current', {
              range: `${vnd(tier.min)} – ${vnd(tier.max)} đ`,
              step: vnd(tier.step),
              from: formatDate(tier.effectiveFrom),
            })}
          </span>
        ) : (
          t('pricing.tier.newIntro')
        )}
      </p>

      <div className="mt-8 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="paper p-5 md:p-6">
          <h2 className="text-h2">
            {tier ? t('pricing.tier.newRange') : t('pricing.tier.range')}
          </h2>
          {!tier && (
            <div className="mt-4">
              <Field
                label={t('pricing.tier.group')}
                hint={t('pricing.tier.groupHint')}
              >
                <input
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder={t('pricing.tier.groupPlaceholder')}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t('pricing.tier.min')} suffix="đ">
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
            <Field label={t('pricing.tier.max')} suffix="đ">
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
              label={t('pricing.tier.step')}
              suffix="đ"
              hint={t('pricing.tier.stepHint')}
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
            <Field
              label={t('pricing.tier.from')}
              hint={t('pricing.tier.fromHint')}
            >
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
            {tier
              ? t('pricing.tier.reasonChange')
              : t('pricing.tier.reasonCreate')}
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                tier
                  ? t('pricing.tier.reasonChangePlaceholder')
                  : t('pricing.tier.reasonCreatePlaceholder')
              }
              className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
            />
            <span className="text-fg-muted text-caption font-normal">
              {t('pricing.tier.reasonHint')}
            </span>
          </label>

          <div className="bg-sunken rounded-surface mt-5 p-3 text-sm">
            <p className="text-fg-strong font-semibold">
              {t('pricing.tier.previewTitle')}
            </p>
            <p className="num mt-1">
              {t('pricing.tier.preview', {
                range: `${lo ? vnd(lo) : '…'} – ${hi ? vnd(hi) : '…'} đ`,
                share: expertShare,
              })}
            </p>
          </div>
        </section>

        {!tier ? (
          <section className="paper p-5">
            <h2 className="text-h2">{t('pricing.tier.afterTitle')}</h2>
            <Note title={t('pricing.tier.afterNoExpertTitle')}>
              {t('pricing.tier.afterNoExpert')}
            </Note>
            <Note title={t('pricing.tier.afterMarketTitle')}>
              {t('pricing.tier.afterMarket')}
            </Note>
          </section>
        ) : (
          <section className="paper p-5">
            <h2 className="text-h2">{t('pricing.tier.impact')}</h2>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                [tier.expertsAccepting, t('pricing.tier.inGroup'), ''],
                [
                  outside.length,
                  t('pricing.tier.outside'),
                  outside.length ? 'text-warning' : '',
                ],
                [tier.activeCases, t('pricing.tier.activeCases'), ''],
              ].map(([n, label, cls]) => (
                <div key={label as string}>
                  <dd
                    className={`text-fg-strong num text-2xl font-semibold ${cls}`}
                  >
                    {n}
                  </dd>
                  <dt className="text-fg-muted text-caption">{label}</dt>
                </div>
              ))}
            </dl>

            {outside.length > 0 && (
              <>
                <p className="eyebrow mt-4">{t('pricing.tier.outside')}</p>
                <ul className="divide-border-subtle mt-1 divide-y text-sm">
                  {outside.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 py-2">
                      <span>
                        <span className="text-fg-strong block font-semibold">
                          {e.name}
                        </span>
                        <span className="text-warning text-caption">
                          {e.fee < lo
                            ? t('pricing.tier.below')
                            : t('pricing.tier.above')}
                        </span>
                      </span>
                      <span className="num">{vnd(e.fee)} đ</span>
                    </li>
                  ))}
                </ul>
                <Note title={t('pricing.tier.outsideNoteTitle')}>
                  {t('pricing.tier.outsideNote')}
                </Note>
              </>
            )}
            {tier.activeCases > 0 && (
              <Note
                title={t('pricing.tier.casesNoteTitle', {
                  count: tier.activeCases,
                })}
              >
                {t('pricing.tier.casesNote')}
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
            ? t('pricing.tier.readyChange', {
                date: formatDate(effectiveFrom),
                count: tier.expertsAccepting,
              })
            : t('pricing.tier.readyCreate', { date: formatDate(effectiveFrom) })
        }
        secondary={
          <Link
            to="/admin/pricing"
            className="btn btn-press btn-secondary no-underline"
          >
            {t('pricing.tier.cancel')}
          </Link>
        }
        primary={{
          label: busy
            ? t('pricing.tier.saving')
            : tier
              ? t('pricing.tier.schedule')
              : t('pricing.tier.create'),
          disabled: blockers.length > 0 || busy,
          onClick: () => {
            setBusy(true)
            setError(null)
            const name = tier?.group ?? group.trim()
            onSubmit({
              group: name,
              min: lo,
              max: hi,
              step: st,
              effectiveFrom,
              reason: reason.trim(),
            })
              .then(() =>
                navigate('/admin/pricing', {
                  state: {
                    toast: tier
                      ? t('pricing.tier.scheduled', {
                          name,
                          date: formatDate(effectiveFrom),
                        })
                      : t('pricing.tier.created', {
                          name,
                          date: formatDate(effectiveFrom),
                        }),
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
