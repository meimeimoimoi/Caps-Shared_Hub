import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleAlert, FilePlus2 } from 'lucide-react'
import { FormField } from '@/components/ui/forms/form-field'
import { useExpertBio } from '@/features/expert-bio/hooks/useExpertBio'
import { FilePicker, Initials } from '@/features/review-case/components/CaseUi'
import { fieldClass, useCaseFormat } from '@/features/review-case/ui'
import { DEMO_CASES, REVIEWABLE_DRAFTS } from '@/features/review-case/fixtures'
import { cn } from '@/lib/utils'

/* Flow 5 · Bước 1: gửi Review Request cho chuyên gia đã chọn trên Sàn.
 * Chỉ tạo case ở PENDING_EXPERT_RESPONSE; thanh toán chỉ mở sau khi chuyên gia nhận. */

const initialsOf = (name: string) =>
  name
    .replace(/^(ThS|TS|LS)\.\s*/, '')
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export default function ReviewRequestPage() {
  const { t } = useTranslation(['reviewCase', 'common'])
  const f = useCaseFormat()
  const id = useId()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const expertId = params.get('expert') ?? undefined
  const query = useExpertBio(expertId)
  const bio = query.data
  const service = bio?.services.find(
    (s) => s.serviceId === params.get('service')
  )

  const [draftId, setDraftId] = useState<string>(REVIEWABLE_DRAFTS[0]?.id ?? '')
  const [scope, setScope] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const draftError = submitted && !draftId
  const consentError = submitted && !consent

  useEffect(() => {
    document.title = `${t('request.title')} | Shared Hub`
  }, [t])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!draftId || !consent) return
    navigate(`/cases/${DEMO_CASES[0].id}`)
  }

  const profileHref = `/experts/${expertId ?? ''}`

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="text-fg-muted mb-6 flex flex-wrap items-center gap-2 text-sm"
      >
        <Link
          to="/marketplace"
          className="hover:text-fg-strong inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {t('marketplace')}
        </Link>
        {bio && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={profileHref} className="hover:text-fg-strong">
              {bio.displayName}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-fg-strong">
          {t('request.title')}
        </span>
      </nav>

      {query.isPending ? (
        <div
          role="status"
          aria-label={t('common:loading')}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          {[0, 1].map((i) => (
            <div key={i} className="paper space-y-4 p-8">
              <span className="bg-sunken block h-7 w-2/3 rounded motion-safe:animate-pulse" />
              <span className="bg-sunken block h-4 w-full rounded motion-safe:animate-pulse" />
              <span className="bg-sunken block h-24 w-full rounded motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      ) : !bio || !service ? (
        <div role="alert" className="paper mx-auto max-w-lg p-8 text-center">
          <CircleAlert
            size={28}
            aria-hidden="true"
            className="text-danger mx-auto"
          />
          <p className="text-fg-strong mt-4 font-semibold">
            {!bio ? t('request.expertMissing') : t('request.serviceMissing')}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {!bio && (
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="btn btn-secondary"
              >
                {t('retry')}
              </button>
            )}
            <Link
              to={bio ? profileHref : '/marketplace'}
              className="btn btn-press btn-primary"
            >
              {bio ? t('request.backToProfile') : t('marketplace')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-h1 font-serif">{t('request.title')}</h1>
          <p className="text-fg-muted mt-2 mb-8 max-w-[60ch]">
            {t('request.lead')}
          </p>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <form
              noValidate
              onSubmit={submit}
              className="paper min-w-0 p-6 md:p-10"
            >
              <fieldset
                aria-describedby={draftError ? `${id}-draft-error` : undefined}
              >
                <legend className="text-fg-strong mb-3 text-sm font-semibold">
                  {t('request.drafts')}
                </legend>
                {REVIEWABLE_DRAFTS.length === 0 ? (
                  <div className="border-border-control rounded-surface border border-dashed p-6 text-center">
                    <p className="text-fg-muted">{t('request.noDrafts')}</p>
                    <Link to="/drafts" className="btn btn-secondary mt-4">
                      <FilePlus2 size={16} aria-hidden="true" />
                      {t('request.noDraftsCta')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {REVIEWABLE_DRAFTS.map((d) => (
                      <label
                        key={d.id}
                        className={cn(
                          'rounded-surface flex cursor-pointer items-start gap-3 border p-4 transition-colors',
                          draftId === d.id
                            ? 'border-ink bg-sunken'
                            : 'border-border hover:border-border-control'
                        )}
                      >
                        <input
                          type="radio"
                          name="draft"
                          value={d.id}
                          checked={draftId === d.id}
                          onChange={() => setDraftId(d.id)}
                          className="accent-ink mt-1 size-4 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="text-fg-strong block font-semibold">
                            {d.name}
                          </span>
                          <span className="text-fg-muted num mt-0.5 block text-sm">
                            {t('request.draftMeta', {
                              aiDraft: d.aiDraft,
                              snapshot: d.snapshot,
                              template: d.template,
                            })}
                          </span>
                          <span className="text-fg-muted mt-0.5 block text-sm">
                            {t('request.draftCounts', {
                              citations: d.citations,
                              documents: d.documents,
                            })}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {draftError && (
                  <p
                    id={`${id}-draft-error`}
                    role="alert"
                    className="text-danger mt-2 text-sm"
                  >
                    {t('request.draftRequired')}
                  </p>
                )}
              </fieldset>

              <div className="mt-8">
                <FormField
                  label={t('request.scope')}
                  htmlFor={`${id}-scope`}
                  hint={`${t('request.scopeHint')} ${scope.length}/1000`}
                  hintId={`${id}-scope-hint`}
                >
                  <textarea
                    id={`${id}-scope`}
                    rows={4}
                    maxLength={1000}
                    value={scope}
                    aria-describedby={`${id}-scope-hint`}
                    onChange={(e) => setScope(e.target.value)}
                    className={cn(fieldClass, 'resize-y')}
                  />
                </FormField>
                <FormField
                  label={t('request.files')}
                  htmlFor={`${id}-files`}
                  hint={t('request.filesHint')}
                  hintId={`${id}-files-hint`}
                >
                  <FilePicker id={`${id}-files`} hintId={`${id}-files-hint`} />
                </FormField>
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={consentError}
                  aria-describedby={
                    consentError ? `${id}-consent-error` : undefined
                  }
                  className="accent-ink mt-0.5 size-4 shrink-0"
                />
                <span>{t('request.consent')}</span>
              </label>
              {consentError && (
                <p
                  id={`${id}-consent-error`}
                  role="alert"
                  className="text-danger mt-2 pl-7 text-sm"
                >
                  {t('request.consentRequired')}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-press btn-primary mt-8 max-sm:w-full"
              >
                {t('request.submit')}
              </button>
            </form>

            <aside className="min-w-0 space-y-6 max-lg:order-first">
              <section className="paper p-5" aria-labelledby="req-summary">
                <h2 id="req-summary" className="eyebrow font-sans">
                  {t('request.summary')}
                </h2>
                <div className="mt-4 flex items-center gap-3">
                  <Initials
                    text={initialsOf(bio.displayName)}
                    color="var(--color-ink)"
                  />
                  <div className="min-w-0">
                    <p className="text-fg-strong font-semibold">
                      {bio.displayName}
                    </p>
                    <p className="text-fg-muted truncate text-sm">
                      {bio.headline}
                    </p>
                  </div>
                </div>
                <dl className="border-border-subtle mt-5 space-y-3 border-t pt-4 text-sm">
                  <div>
                    <dt className="text-fg-muted">{t('meta.service')}</dt>
                    <dd className="text-fg-strong mt-0.5">
                      {service.serviceName}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-fg-muted">{t('meta.fee')}</dt>
                    <dd className="num text-fg-strong text-h2 font-semibold">
                      {service.price == null
                        ? t('request.priceOnRequest')
                        : f.money(Number(service.price))}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                aria-labelledby="req-next"
                className="border-border border-t pt-5"
              >
                <h2 id="req-next" className="eyebrow font-sans">
                  {t('request.nextTitle')}
                </h2>
                <ol className="mt-4 space-y-4">
                  {(['s1', 's2', 's3'] as const).map((k, i) => (
                    <li key={k} className="flex gap-3 text-sm">
                      <span className="num border-border-control text-fg-strong grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{t(`request.steps.${k}`)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
