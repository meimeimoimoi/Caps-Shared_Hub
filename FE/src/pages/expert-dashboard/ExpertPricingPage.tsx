import { useEffect, useRef, useState } from 'react'
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useLocation,
  useParams,
} from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, Info, Save, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
      expertId={context.data!.expertId}
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
      ) : !isExpertDemo ? (
        <div className="epr-notice" role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <h2>{t('pricing.apiUnavailable')}</h2>
            <p>{t('pricing.apiUnavailableHelp')}</p>
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
        <PricingEditor
          service={service}
          data={query.data}
          mutation={mutation}
        />
      )}
    </div>
  )
}

function PricingEditor({
  service,
  data,
  mutation,
}: {
  service: ServiceReadiness
  data: PricingWorkspace
  mutation: ReturnType<typeof useExpertPricing>['mutation']
}) {
  const { t } = useTranslation('expert')
  const format = useFormatters()
  const formRef = useRef<HTMLFormElement>(null)
  const working =
    data.versions.find((v) => editableStatus(v.status)) ??
    data.versions.find((v) => v.status === 'PENDING_APPROVAL')
  const effective = data.versions.find(
    (v) => v.id === service.pricing?.version && v.status === 'APPROVED'
  )
  const initial: PricingInput = working
    ? {
        amount: working.amount,
        effectiveFrom: working.effectiveFrom,
        reason: working.reason,
      }
    : {
        amount: effective?.amount ?? '',
        effectiveFrom: businessDate(),
        reason: '',
      }
  const [input, setInput] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [revision, setRevision] = useState(data.revision)
  const [errors, setErrors] = useState<PricingErrors>({})
  const [feedback, setFeedback] = useState<'saved' | 'submitted' | null>(null)
  const pending = data.versions.some((v) => v.status === 'PENDING_APPROVAL')
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
          const version = next.versions.find(
            (v) => v.status === (submit ? 'PENDING_APPROVAL' : 'DRAFT')
          )!
          const saved = {
            amount: version.amount,
            effectiveFrom: version.effectiveFrom,
            reason: version.reason,
          }
          setInput(saved)
          setBaseline(saved)
          setRevision(next.revision)
          setFeedback(submit ? 'submitted' : 'saved')
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
      <div className="epr-notice epr-demo">
        <Info size={18} aria-hidden="true" />
        <p>{t('pricing.demo')}</p>
      </div>
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
      <div className="epr-layout">
        <section className="epr-editor" aria-labelledby="epr-editor-title">
          <div className="epr-section-title">
            <h2 id="epr-editor-title">
              {pending
                ? t('pricing.pendingTitle')
                : working
                  ? t('pricing.editDraft')
                  : t('pricing.newVersion')}
            </h2>
            <span
              className={'ep-status ' + statusClass(working?.status ?? 'DRAFT')}
            >
              {working?.id ?? t('pricing.unsavedVersion')} ·{' '}
              {status(working?.status ?? 'DRAFT')}
            </span>
          </div>
          <p className="epr-section-help">
            {pending ? t('pricing.pendingHelp') : t('pricing.editorHelp')}
          </p>
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
                <label htmlFor="epr-amount">
                  {t('pricing.amount')} <span>VND</span>
                </label>
                <input
                  id="epr-amount"
                  name="amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={input.amount}
                  onChange={(event) => update('amount', event.target.value)}
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={
                    'epr-amount-help' +
                    (errors.amount ? ' epr-amount-error' : '')
                  }
                />
                <p id="epr-amount-help">{t('pricing.amountHelp')}</p>
                {errors.amount && (
                  <p id="epr-amount-error" className="epr-field-error">
                    {t(`pricing.errors.${errors.amount}`)}
                  </p>
                )}
              </div>
              <div className="epr-field">
                <label htmlFor="epr-date">{t('pricing.effectiveFrom')}</label>
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
                    'epr-date-help' +
                    (errors.effectiveFrom ? ' epr-date-error' : '')
                  }
                />
                <p id="epr-date-help">{t('pricing.dateHelp')}</p>
                {errors.effectiveFrom && (
                  <p id="epr-date-error" className="epr-field-error">
                    {t(`pricing.errors.${errors.effectiveFrom}`)}
                  </p>
                )}
              </div>
              <div className="epr-field">
                <label htmlFor="epr-reason">{t('pricing.reason')}</label>
                <textarea
                  id="epr-reason"
                  name="reason"
                  rows={4}
                  maxLength={1000}
                  value={input.reason}
                  onChange={(event) => update('reason', event.target.value)}
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={
                    'epr-reason-help' +
                    (errors.reason ? ' epr-reason-error' : '')
                  }
                />
                <div className="epr-field-meta">
                  <p id="epr-reason-help">{t('pricing.reasonHelp')}</p>
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
                  {busy ? t('pricing.saving') : t('pricing.submit')}
                </button>
              </div>
            )}
            <div className="epr-feedback" aria-live="polite">
              {feedback && (
                <p className="epr-success">{t(`pricing.${feedback}`)}</p>
              )}
            </div>
            {mutation.isError && (
              <p role="alert" className="epr-field-error">
                {t('pricing.saveFailed')}
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
                {effective
                  ? format.money(effective.amount)
                  : t('noEffectivePricing')}
              </dd>
              <dd>{effective?.id ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('pricing.proposed')}</dt>
              <dd className="epr-proposed-price">
                {/^\d+$/.test(input.amount) ? format.money(input.amount) : '—'}
              </dd>
              <dd>{format.dateOnly(input.effectiveFrom)}</dd>
            </div>
          </dl>
          <div className="epr-policy">
            <CheckCircle2 size={18} aria-hidden="true" />
            <p>{t('pricing.approvalHelp')}</p>
          </div>
          <p>{t('pricing.snapshotHelp')}</p>
          <p>{t('pricing.slaHelp')}</p>
        </aside>
      </div>
      <section className="epr-history" aria-labelledby="epr-history-title">
        <h2 id="epr-history-title">{t('pricing.history')}</h2>
        <p>{t('pricing.historyHelp')}</p>
        <div
          className="epr-table-scroll"
          role="region"
          tabIndex={0}
          aria-label={t('pricing.history')}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">{t('pricing.version')}</th>
                <th scope="col">{t('pricing.amount')}</th>
                <th scope="col">{t('pricing.versionStatus')}</th>
                <th scope="col">{t('pricing.effectiveDate')}</th>
              </tr>
            </thead>
            <tbody>
              {data.versions.map((version) => (
                <tr key={version.id}>
                  <th scope="row">
                    {version.id}
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
      </section>
      {data.audit.length > 0 && (
        <section className="epr-audit">
          <h2>{t('pricing.activity')}</h2>
          <ol>
            {[...data.audit].reverse().map((event, index) => (
              <li key={event.at + index}>
                <span>
                  {event.versionId} ·{' '}
                  {t(
                    event.action === 'SAVED'
                      ? 'pricing.auditSaved'
                      : 'pricing.auditSubmitted'
                  )}
                </span>
                <time dateTime={event.at}>
                  {format.timestamp(event.at, 'Asia/Ho_Chi_Minh', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}
