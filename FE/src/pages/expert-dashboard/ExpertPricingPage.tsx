import { useEffect, useRef, useState } from 'react'
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useLocation,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Info,
  Save,
  Send,
  ArrowRight,
  PencilLine,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import {
  useExpertContext,
  type ServiceReadiness,
} from '@/features/expert-context'
import { useFormatters } from '@/hooks/useFormatters'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useExpertPricing } from '@/features/expert-pricing/useExpertPricing'
import {
  businessDate,
  editableStatus,
  validatePricing,
  type PricingErrors,
  type PricingInput,
  type PricingWorkspace,
} from '@/features/expert-pricing/model'
import '@/features/expert-pricing/pricing.css'

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
        <div className="ep-empty">
          <h1>{t('pricing.notFound')}</h1>
          <p>{t('pricing.notFoundHelp')}</p>
        </div>
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
  const { query, mutation } = useExpertPricing(
    expertId,
    service.serviceId,
    qualified
  )
  return (
    <div className="epr-page">
      {back}
      <div className="ep-page-heading">
        <div>
          <h1>{t('pricing.title')}</h1>
          <p>{service.serviceName}</p>
        </div>
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
      </div>
      {!qualified ? (
        <div className="epr-notice" role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <h2>{t('pricing.restricted')}</h2>
            <p>{t('pricing.restrictedHelp')}</p>
          </div>
        </div>
      ) : query.isError ? (
        <div className="ep-empty">
          <h2>{t('pricing.loadFailed')}</h2>
          <button className="ep-button" onClick={() => void query.refetch()}>
            {t('pricing.retry')}
          </button>
        </div>
      ) : !query.data ? (
        <div role="status" className="ep-skeleton ep-skeleton-section">
          {t('pricing.loading')}
        </div>
      ) : (
        <PricingEditor data={query.data} mutation={mutation} />
      )}
    </div>
  )
}

function PricingEditor({
  data,
  mutation,
}: {
  data: PricingWorkspace
  mutation: ReturnType<typeof useExpertPricing>['mutation']
}) {
  const { t } = useTranslation('expert')
  const format = useFormatters()
  const formRef = useRef<HTMLFormElement>(null)
  const working =
    data.versions.find((v) => editableStatus(v.status)) ??
    data.versions.find((v) => v.status === 'PENDING_APPROVAL')
  // The approved version that applies today (a superseded one stays in effect until its end date)
  const today = businessDate()
  const effective = data.versions.find(
    (v) =>
      (v.status === 'APPROVED' || v.status === 'SUPERSEDED') &&
      v.effectiveFrom <= today &&
      (!v.effectiveTo || v.effectiveTo >= today)
  )
  const label = (versionId: string) => {
    const version = data.versions.find((v) => v.id === versionId)
    return version
      ? t('pricingUx.record', { number: version.sequence })
      : t('pricingUx.recordHeading')
  }
  const scheduled = data.versions
    .filter((v) => v.status === 'APPROVED' && v.effectiveFrom > today)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]
  const initial: PricingInput = working
    ? {
        amount: working.amount,
        effectiveFrom: working.effectiveFrom,
        reason: working.reason,
      }
    : {
        amount: effective?.amount ?? scheduled?.amount ?? '',
        effectiveFrom: scheduled?.effectiveFrom ?? businessDate(),
        reason: '',
      }
  const savedPrice = effective ?? scheduled
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [revision, setRevision] = useState(data.revision)
  const [errors, setErrors] = useState<PricingErrors>({})
  const [feedback, setFeedback] = useState<
    | 'saved'
    | 'submitted'
    | 'savedApi'
    | 'submittedPending'
    | 'submittedApproved'
    | null
  >(null)
  const pending = data.versions.some((v) => v.status === 'PENDING_APPROVAL')
  const showEditor =
    !pending &&
    (editing ||
      !!data.versions.find((v) => editableStatus(v.status)) ||
      !savedPrice)
  const busy = mutation.isPending
  const dirty = JSON.stringify(input) !== JSON.stringify(baseline)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search
  )
  useBeforeUnload((event) => {
    if (dirty || busy) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  const update = (key: keyof PricingInput, value: string) => {
    setInput((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setFeedback(null)
    mutation.reset()
  }
  const save = (submit: boolean) => {
    if (busy || pending) return
    const issues = validatePricing(input, submit)
    setErrors(issues)
    if (Object.keys(issues).length) {
      const first = Object.keys(issues)[0]
      formRef.current
        ?.querySelector<HTMLElement>('[name="' + first + '"]')
        ?.focus()
      return
    }
    setFeedback(null)
    mutation.mutate(
      { input, revision, submit },
      {
        onSuccess: (next) => {
          // The version just saved has the highest sequence (it may be auto-approved on submit)
          const version = next.versions.reduce((a, b) =>
            b.sequence > a.sequence ? b : a
          )
          const saved = {
            amount: version.amount,
            effectiveFrom: version.effectiveFrom,
            reason: version.reason,
          }
          setInput(saved)
          setBaseline(saved)
          setRevision(next.revision)
          if (submit) setEditing(false)
          setFeedback(
            isExpertDemo
              ? submit
                ? 'submitted'
                : 'saved'
              : !submit
                ? 'savedApi'
                : version.status === 'APPROVED'
                  ? 'submittedApproved'
                  : 'submittedPending'
          )
        },
      }
    )
  }
  const status = (value: PricingWorkspace['versions'][number]['status']) =>
    t(`pricing.status.${value}`)
  const statusClass = (value: string) =>
    value === 'APPROVED'
      ? 'ep-status-ready'
      : value === 'PENDING_APPROVAL' || value === 'RETURN_FOR_REVISION'
        ? 'ep-status-paused'
        : value === 'REJECTED'
          ? 'ep-status-danger'
          : 'ep-status-neutral'
  return (
    <>
      {isExpertDemo && (
        <div className="epr-notice epr-demo">
          <Info size={18} aria-hidden="true" />
          <p>{t('pricing.demo')}</p>
        </div>
      )}
      {blocker.state === 'blocked' && (
        <div className="epr-navigation" role="alert">
          <p>{busy ? t('pricing.saving') : t('pricing.unsaved')}</p>
          <button
            className="ep-button"
            type="button"
            onClick={() => blocker.reset()}
          >
            {t('pricing.stay')}
          </button>
          {!busy && (
            <button
              className="ep-button"
              type="button"
              onClick={() => blocker.proceed()}
            >
              {t('pricing.leave')}
            </button>
          )}
        </div>
      )}
      {feedback && (
        <p role="status" className="epr-success">
          {t(`pricing.${feedback}`)}
        </p>
      )}
      {savedPrice && !showEditor && (
        <section
          className="epr-current-card"
          aria-labelledby="epr-current-heading"
        >
          <div className="epr-current-header">
            <div>
              <h2 id="epr-current-heading">
                {t(
                  effective
                    ? 'pricingUx.currentHeading'
                    : 'pricingUx.scheduledHeading'
                )}
              </h2>
              <p className="epr-current-amount">
                {format.money(savedPrice.amount)}
                <span>{t('pricingUx.perBooking')}</span>
              </p>
              <p className="epr-current-date">
                {t('pricingFrom', {
                  date: format.dateOnly(savedPrice.effectiveFrom),
                })}
              </p>
            </div>
            {!pending && (
              <button
                type="button"
                className="ep-button"
                onClick={() => setEditing(true)}
              >
                <PencilLine size={16} aria-hidden="true" />
                {t('pricingUx.changePrice')}
              </button>
            )}
          </div>
          {!pending && (
            <div className="epr-next-step">
              <div>
                <h3>{t('pricingUx.nextHeading')}</h3>
                <p>{t('pricingUx.nextHelp')}</p>
              </div>
              <Link
                className="ep-button ep-button-primary"
                to="/expert/availability"
              >
                {t('pricingUx.nextAction')}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      )}
      {pending && working && (
        <section className="epr-current-card" role="status">
          <h2>{t('pricingUx.pendingHeading')}</h2>
          <p className="epr-current-amount">
            {format.money(working.amount)}
            <span>{t('pricingUx.perBooking')}</span>
          </p>
          <p className="epr-current-date">
            {t('pricingFrom', { date: format.dateOnly(working.effectiveFrom) })}
          </p>
          <p>{t('pricingUx.pendingHelp')}</p>
        </section>
      )}
      {showEditor && (
        <div className="epr-layout">
          <section className="epr-editor" aria-labelledby="epr-editor-title">
            <div className="epr-section-title">
              <div className="relative flex items-center gap-2">
                <h2 id="epr-editor-title">
                  {pending
                    ? t('pricing.pendingTitle')
                    : working
                      ? t('pricingUx.editDraft')
                      : t(
                          savedPrice
                            ? 'pricingUx.changePrice'
                            : 'pricingUx.firstPrice'
                        )}
                </h2>
                <HelpTip
                  className="!static"
                  label={t('pricing.help', { label: t('pricing.newVersion') })}
                >
                  {pending ? t('pricing.pendingHelp') : t('pricing.editorHelp')}
                </HelpTip>
              </div>
              <span
                className={
                  'ep-status ' + statusClass(working?.status ?? 'DRAFT')
                }
              >
                {working ? label(working.id) : t('pricing.unsavedVersion')} ·{' '}
                {status(working?.status ?? 'DRAFT')}
              </span>
            </div>
            {working?.reviewNote && (
              <div className="epr-review-note">
                <h3>{t('pricing.reviewNote')}</h3>
                <p>{working.reviewNote}</p>
              </div>
            )}
            <form
              ref={formRef}
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                save(true)
              }}
              aria-busy={busy}
            >
              <fieldset disabled={pending || busy}>
                <div className="epr-field">
                  <div className="relative flex items-center gap-2">
                    <label htmlFor="epr-amount">{t('pricing.amount')}</label>
                    <HelpTip
                      className="!static"
                      label={t('pricing.help', { label: t('pricing.amount') })}
                    >
                      {t('pricing.amountHelp')}
                    </HelpTip>
                  </div>
                  <div className="epr-amount-control">
                    <input
                      id="epr-amount"
                      name="amount"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1000000"
                      value={input.amount}
                      onChange={(event) => update('amount', event.target.value)}
                      aria-invalid={Boolean(errors.amount)}
                      aria-describedby={
                        errors.amount ? 'epr-amount-error' : undefined
                      }
                    />
                    <span aria-hidden="true">VND</span>
                  </div>
                  {errors.amount && (
                    <p id="epr-amount-error" className="epr-field-error">
                      {t(`pricing.errors.${errors.amount}`)}
                    </p>
                  )}
                </div>
                <div className="epr-field">
                  <div className="relative flex items-center gap-2">
                    <label htmlFor="epr-date">
                      {t('pricing.effectiveFrom')}
                    </label>
                    <HelpTip
                      className="!static"
                      label={t('pricing.help', {
                        label: t('pricing.effectiveFrom'),
                      })}
                    >
                      {t('pricing.dateHelp')}
                    </HelpTip>
                  </div>
                  <input
                    id="epr-date"
                    name="effectiveFrom"
                    type="date"
                    min={businessDate()}
                    value={input.effectiveFrom}
                    onChange={(event) =>
                      update('effectiveFrom', event.target.value)
                    }
                    aria-invalid={Boolean(errors.effectiveFrom)}
                    aria-describedby={
                      errors.effectiveFrom ? 'epr-date-error' : undefined
                    }
                  />
                  {errors.effectiveFrom && (
                    <p id="epr-date-error" className="epr-field-error">
                      {t(`pricing.errors.${errors.effectiveFrom}`)}
                    </p>
                  )}
                </div>
                <div className="epr-field epr-reason-field">
                  <div className="relative flex items-center gap-2">
                    <label htmlFor="epr-reason">{t('pricing.reason')}</label>
                    <HelpTip
                      className="!static"
                      label={t('pricing.help', { label: t('pricing.reason') })}
                    >
                      {t('pricing.reasonHelp')}
                    </HelpTip>
                  </div>
                  <textarea
                    id="epr-reason"
                    name="reason"
                    rows={4}
                    placeholder={t('pricing.reasonPlaceholder')}
                    maxLength={1000}
                    value={input.reason}
                    onChange={(event) => update('reason', event.target.value)}
                    aria-invalid={Boolean(errors.reason)}
                    aria-describedby={
                      errors.reason ? 'epr-reason-error' : undefined
                    }
                  />
                  <div className="epr-field-meta">
                    <span>{format.number(input.reason.length)}/1,000</span>
                  </div>
                  {errors.reason && (
                    <p id="epr-reason-error" className="epr-field-error">
                      {t(`pricing.errors.${errors.reason}`)}
                    </p>
                  )}
                </div>
              </fieldset>
              {!pending && (
                <div className="epr-form-actions">
                  {savedPrice && editing && !working && <button type="button" className="ep-button" disabled={busy} onClick={() => { setInput(baseline); setErrors({}); setEditing(false) }}>{t('pricingUx.cancel')}</button>}
                  <button
                    className="ep-button"
                    type="button"
                    disabled={busy}
                    onClick={() => save(false)}
                  >
                    <Save size={16} aria-hidden="true" />
                    {t('pricing.saveDraft')}
                  </button>
                  <button
                    className="ep-button ep-button-primary"
                    type="submit"
                    disabled={busy}
                  >
                    <Send size={16} aria-hidden="true" />
                    {busy ? t('pricing.saving') : t('pricingUx.submit')}
                  </button>
                </div>
              )}
              {mutation.isError && (
                <p role="alert" className="epr-field-error">
                  {t('pricing.saveFailed')}
                </p>
              )}
            </form>
          </section>
          <aside className="epr-summary" aria-labelledby="epr-summary-title">
            <div className="relative flex items-center gap-2">
              <h2 id="epr-summary-title">{t('pricing.summary')}</h2>
              <HelpTip
                className="!static"
                label={t('pricing.help', { label: t('pricing.summary') })}
              >
                <div className="space-y-2">
                  <p>
                    {data.autoApproveMaxChangePercent == null
                      ? t('pricing.approvalHelp')
                      : t('pricing.autoApprovalHelp', {
                          percent: data.autoApproveMaxChangePercent,
                        })}
                  </p>
                  <p>{t('pricing.snapshotHelp')}</p>
                  <p>{t('pricing.slaHelp')}</p>
                </div>
              </HelpTip>
            </div>
            <dl>
              <div>
                <dt>{t('pricing.current')}</dt>
                <dd className={effective ? 'epr-price' : 'epr-no-price'}>
                  {effective
                    ? format.money(effective.amount)
                    : t('noEffectivePricing')}
                </dd>
              </div>
              <div>
                <dt>{t('pricing.proposed')}</dt>
                <dd className="epr-proposed-price">
                  {/^\d+$/.test(input.amount)
                    ? format.money(input.amount)
                    : t('pricing.enterAmount')}
                </dd>
                <dd>{format.dateOnly(input.effectiveFrom)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
      <details className="epr-history epr-history-disclosure">
        <summary>
          <h2>{t('pricingUx.history')}</h2>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        {data.versions.length === 0 ? (
          <div className="epr-history-empty">
            <Clock3 size={22} aria-hidden="true" />
            <div>
              <h3>{t('pricing.historyEmpty')}</h3>
            </div>
          </div>
        ) : (
          <div
            className="epr-table-scroll"
            role="region"
            tabIndex={0}
            aria-label={t('pricing.history')}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('pricingUx.recordHeading')}</th>
                  <th scope="col">{t('pricing.amount')}</th>
                  <th scope="col">{t('pricing.versionStatus')}</th>
                  <th scope="col">{t('pricing.effectiveDate')}</th>
                </tr>
              </thead>
              <tbody>
                {data.versions.map((version) => (
                  <tr key={version.id}>
                    <th scope="row">
                      {label(version.id)}
                      {version.id === effective?.id && (
                        <span className="epr-current-label">
                          {t('pricing.current')}
                        </span>
                      )}
                    </th>
                    <td>{format.money(version.amount)}</td>
                    <td>
                      <span
                        className={'ep-status ' + statusClass(version.status)}
                      >
                        {status(version.status)}
                      </span>
                      <details>
                        <summary>{t('pricing.details')}</summary>
                        <p>{version.reason || t('pricing.noReason')}</p>
                        {version.reviewNote && <p>{version.reviewNote}</p>}
                        {version.autoApproved && (
                          <p>
                            {t('pricing.autoApproved', {
                              percent: version.changePercent ?? 0,
                            })}
                          </p>
                        )}
                        <p>
                          {t('pricing.updatedAt', {
                            date: format.timestamp(
                              version.updatedAt,
                              'Asia/Ho_Chi_Minh'
                            ),
                          })}
                        </p>
                      </details>
                    </td>
                    <td>
                      {format.dateOnly(version.effectiveFrom)}
                      {version.effectiveTo && (
                        <p>
                          {t('pricing.until', {
                            date: format.dateOnly(version.effectiveTo),
                          })}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </>
  )
}
