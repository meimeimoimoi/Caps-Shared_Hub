import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/ui/layout/page-header'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Info,
  Save,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useExpertContext,
  type ServiceReadiness,
} from '@/features/expert-context'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
import { useFormatters } from '@/hooks/useFormatters'
import { ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useExpertPricing } from '@/features/expert-pricing/useExpertPricing'
import {
  isBigChange,
  netOf,
  validatePricing,
  type MyService,
  type PriceChange,
  type PricingErrors,
  type PricingInput,
} from '@/features/expert-pricing/model'
import '@/features/expert-pricing/pricing.css'

const LOCAL_TIME_ZONE = 'Asia/Ho_Chi_Minh'
// Whole days, rounding up an older price saved in hours

// Server error codes with their own message (anything else falls back to saveFailed)
const SAVE_ERRORS = [
  'PRICING_NOT_ALLOWED',
  'PLATFORM_FEE_NOT_SET',
  'FEE_INVALID',
  'TURNAROUND_INVALID',
  'OFFERING_CONFLICT',
] as const
type SaveError = (typeof SAVE_ERRORS)[number]
const isSaveError = (code?: string): code is SaveError =>
  (SAVE_ERRORS as readonly (string | undefined)[]).includes(code)

export default function ExpertPricingPage() {
  const { serviceId } = useParams()
  const context = useExpertContext()
  const { t } = useTranslation('expert')
  const location = useLocation()
  useEffect(() => {
    document.title = t('pricing.title') + ' | Shared Hub'
  }, [t])
  const service = context.data?.services.find((s) => s.serviceId === serviceId)
  const back = (
    <Link className="epr-back" to={'/expert/services' + location.search}>
      <ArrowLeft size={16} aria-hidden="true" />
      {t('pricing.back')}
    </Link>
  )
  if (context.isPending)
    return (
      <div role="status" className="ep-skeleton ep-skeleton-section">
        {t('pricing.loading')}
      </div>
    )
  if (!service)
    return (
      <>
        {back}
        <EmptyState title={t('pricing.notFound')}>
          {t('pricing.notFoundHelp')}
        </EmptyState>
      </>
    )
  return (
    <PricingService
      key={context.data!.expertId + ':' + service.serviceId}
      service={service}
      expertId={context.data!.expertId ?? ''}
      activeAccount={context.data!.accountStatus === 'ACTIVE'}
      back={back}
    />
  )
}

function PricingService({
  service,
  expertId,
  activeAccount,
  back,
}: {
  service: ServiceReadiness
  expertId: string
  activeAccount: boolean
  back: React.ReactNode
}) {
  const { t } = useTranslation('expert')
  const qualified =
    activeAccount && service.qualificationStatus === 'APPROVED_FOR_SERVICE'
  const { query, history, mutation } = useExpertPricing(
    expertId,
    service.serviceId,
    qualified
  )
  return (
    <div className="epr-page">
      {back}
      <PageHeader
        className="mb-6"
        title={`${t('pricing.title')} · ${service.serviceName}`}
        badge={
        <span
          className={
            'ep-status ' + (qualified ? 'ep-status-ready' : 'ep-status-paused')
          }
        >
          {qualified ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : (
            <Clock3 size={14} aria-hidden="true" />
          )}
          {qualified ? t('approvedForService') : t('pricing.restricted')}
        </span>
        }
      />
      {!qualified ? (
        <Notice
          title={t('pricing.restricted')}
          text={t('pricing.restrictedHelp')}
        />
      ) : query.isError ? (
        <div className="ep-empty">
          <h2>{t('pricing.loadFailed')}</h2>
          <button className="ep-button" onClick={() => void query.refetch()}>
            {t('pricing.retry')}
          </button>
        </div>
      ) : query.data === undefined ? (
        <div role="status" className="ep-skeleton ep-skeleton-section">
          {t('pricing.loading')}
        </div>
      ) : query.data === null ? (
        <Notice title={t('pricing.notOpen')} text={t('pricing.notOpenHelp')} />
      ) : (
        <PricingEditor
          service={query.data}
          mutation={mutation}
          history={history.data ?? []}
        />
      )}
    </div>
  )
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="epr-notice" role="status">
      <Info size={20} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  )
}

function PricingEditor({
  service,
  mutation,
  history,
}: {
  service: MyService
  mutation: ReturnType<typeof useExpertPricing>['mutation']
  history: PriceChange[]
}) {
  const { t } = useTranslation(['expert', 'common'])
  const format = useFormatters()
  const formRef = useRef<HTMLFormElement>(null)
  const initial: PricingInput = {
    fee: service.fee == null ? '' : String(service.fee),
  }
  const { limits } = service
  const [input, setInput] = useState(initial)
  const [errors, setErrors] = useState<PricingErrors>({})
  const [saved, setSaved] = useState(false)
  // A saved price applies at once with no approval, so the expert confirms it first
  const [confirming, setConfirming] = useState(false)
  const busy = mutation.isPending
  const update = (key: keyof PricingInput, value: string) => {
    setInput((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setSaved(false)
    mutation.reset()
  }
  const review = () => {
    if (busy) return
    const issues = validatePricing(input, limits)
    setErrors(issues)
    if (Object.keys(issues).length) {
      const first = Object.keys(issues)[0]
      formRef.current
        ?.querySelector<HTMLElement>('[name="' + first + '"]')
        ?.focus()
      return
    }
    setConfirming(true)
  }
  const save = () =>
    mutation.mutate(input, {
      onSuccess: (next) => {
        setInput({ fee: String(next.fee) })
        setSaved(true)
      },
      onSettled: () => setConfirming(false),
    })
  const failure = mutation.error
  const saveError =
    failure instanceof ApiError && isSaveError(failure.code)
      ? t(`pricing.errors.${failure.code}`)
      : t('pricing.saveFailed')
  const proposedFee = /^\d+$/.test(input.fee.trim()) ? Number(input.fee) : null
  const bigChange =
    proposedFee != null &&
    isBigChange(service.fee, proposedFee, limits.changeWarningPercent)
  const pending = service.pendingPlatformFee
  return (
    <>
      {isExpertDemo && (
        <div className="epr-notice epr-demo">
          <Info size={18} aria-hidden="true" />
          <p>{t('pricing.demo')}</p>
        </div>
      )}
      {pending && (
        <div className="epr-notice" role="status">
          <Info size={20} aria-hidden="true" />
          <p>
            {t('pricing.pendingFee', {
              date: format.dateOnly(pending.effectiveFrom.slice(0, 10)),
              from: service.platformFeePercent,
              to: pending.percent,
            })}
            {service.fee != null &&
              ' ' +
                t('pricing.pendingFeeNet', {
                  amount: format.money(netOf(service.fee, pending.percent)),
                  current: format.money(
                    netOf(service.fee, service.platformFeePercent)
                  ),
                })}
          </p>
        </div>
      )}
      <div className="epr-layout">
        <section className="epr-editor" aria-labelledby="epr-editor-title">
          <div className="epr-section-title">
            <h2 id="epr-editor-title">
              {service.fee == null
                ? t('pricing.setPrice')
                : t('pricing.editPrice')}
            </h2>
            <HelpTip label={t('pricing.editorHelpLabel')}>
              {t('pricing.editorHelp')}
            </HelpTip>
          </div>
          <form
            ref={formRef}
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              review()
            }}
            aria-busy={busy}
          >
            <fieldset disabled={busy}>
              <div className="epr-field">
                <label htmlFor="epr-fee">
                  {t('pricing.amount')} <span>VND</span>
                </label>
                <input
                  id="epr-fee"
                  name="fee"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={input.fee}
                  onChange={(event) => update('fee', event.target.value)}
                  aria-invalid={Boolean(errors.fee)}
                  aria-describedby={
                    'epr-fee-help' + (errors.fee ? ' epr-fee-error' : '')
                  }
                />
                <p id="epr-fee-help">
                  {t('pricing.amountHelp', {
                    min: format.money(limits.minFee),
                    max: format.money(limits.maxFee),
                    step: format.money(limits.feeStep),
                  })}
                </p>
                {errors.fee && (
                  <p id="epr-fee-error" className="epr-field-error">
                    {t(`pricing.errors.${errors.fee}`, {
                      min: format.money(limits.minFee),
                      max: format.money(limits.maxFee),
                      step: format.money(limits.feeStep),
                    })}
                  </p>
                )}
              </div>
            </fieldset>
            <div className="epr-form-actions">
              <button
                className="ep-button ep-button-primary"
                type="submit"
                disabled={busy}
              >
                <Save size={16} aria-hidden="true" />
                {busy ? t('pricing.saving') : t('pricing.save')}
              </button>
            </div>
            <div className="epr-feedback" aria-live="polite">
              {saved && <p className="epr-success">{t('pricing.saved')}</p>}
            </div>
            {mutation.isError && (
              <p role="alert" className="epr-field-error">
                {saveError}
              </p>
            )}
          </form>
        </section>
        <aside className="epr-summary" aria-labelledby="epr-summary-title">
          <h2 id="epr-summary-title">{t('pricing.summary')}</h2>
          <dl>
            <div>
              <dt>{t('pricing.current')}</dt>
              <dd className="epr-price">
                {service.fee == null
                  ? t('noEffectivePricing')
                  : format.money(service.fee)}
              </dd>
              <dd>
                {service.netAmount == null
                  ? '—'
                  : t('pricing.youReceive', {
                      amount: format.money(service.netAmount),
                    })}
              </dd>
            </div>
            <div>
              <dt>{t('pricing.proposed')}</dt>
              <dd className="epr-proposed-price">
                {proposedFee == null ? '—' : format.money(proposedFee)}
              </dd>
              <dd>
                {proposedFee == null
                  ? '—'
                  : t('pricing.youReceive', {
                      amount: format.money(
                        netOf(proposedFee, service.platformFeePercent)
                      ),
                    })}
              </dd>
            </div>
          </dl>
          <div className="epr-policy">
            <CheckCircle2 size={18} aria-hidden="true" />
            <p>
              {t('pricing.platformFeeHelp', {
                percent: service.platformFeePercent,
              })}
            </p>
          </div>
          <p>{t('pricing.snapshotHelp')}</p>
        </aside>
      </div>
      <section className="epr-editor" aria-labelledby="epr-history-title">
        <div className="epr-section-title">
          <h2 id="epr-history-title">{t('pricing.historyTitle')}</h2>
        </div>
        {history.length === 0 ? (
          <p>{t('pricing.historyNone')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-fg-muted">
              <tr className="[&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                <th>{t('pricing.historyTime')}</th>
                <th>{t('pricing.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((change) => (
                <tr
                  key={change.changedAt}
                  className="border-border-subtle border-t [&>td]:py-2"
                >
                  <td className="num">
                    {format.timestamp(change.changedAt, LOCAL_TIME_ZONE)}
                  </td>
                  <td className="num">
                    {change.oldFee == null
                      ? format.money(change.newFee)
                      : `${format.money(change.oldFee)} → ${format.money(change.newFee)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {confirming && proposedFee != null && (
        <Modal
          title={t('pricing.confirmTitle')}
          onClose={() => !busy && setConfirming(false)}
          preventClose={busy}
          onSubmit={save}
          footer={
            <>
              <button
                type="button"
                className="ep-button"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                className="ep-button ep-button-primary"
                disabled={busy}
              >
                {busy ? t('pricing.saving') : t('pricing.confirm')}
              </button>
            </>
          }
        >
          {bigChange && (
            <div
              role="alert"
              className="border-danger text-danger rounded-control mt-2 flex gap-2 border p-3 text-sm font-semibold"
            >
              <AlertTriangle size={18} aria-hidden="true" />
              <p>
                {t('pricing.bigChange', {
                  percent: limits.changeWarningPercent,
                })}
              </p>
            </div>
          )}
          <dl className="[&_dt]:text-fg-muted mt-2 grid gap-3 text-sm [&_dd]:text-right [&_dd]:font-semibold [&>div]:flex [&>div]:justify-between [&>div]:gap-4">
            <div>
              <dt>{t('pricing.amount')}</dt>
              <dd>
                {service.fee == null
                  ? format.money(proposedFee)
                  : `${format.money(service.fee)} → ${format.money(proposedFee)}`}
              </dd>
            </div>
            <div>
              <dt>{t('pricing.youReceiveLabel')}</dt>
              <dd>
                {format.money(netOf(proposedFee, service.platformFeePercent))} (
                {t('pricing.afterFee', { percent: service.platformFeePercent })}
                )
              </dd>
            </div>
          </dl>
          <p className="text-fg-muted mt-4 text-sm">
            {t('pricing.confirmHelp')}
          </p>
        </Modal>
      )}
    </>
  )
}
