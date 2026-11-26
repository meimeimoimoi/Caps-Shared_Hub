import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  FilePlus2,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { FormField } from '@/components/ui/forms/form-field'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { usePublicExpert } from '@/features/marketplace/hooks/useMarketplace'
import { FilePicker, Initials } from '@/features/review-case/components/CaseUi'
import { ACCEPT, MAX_BYTES } from '@/features/review-case/components/CaseAttachments'
import { useFileDrop } from '@/features/review-case/hooks/useFileDrop'
import { fieldClass, useCaseFormat } from '@/features/review-case/ui'
import { DEMO_CASES, REVIEWABLE_DRAFTS } from '@/features/review-case/fixtures'
import {
  createReviewCase,
  getBookingTerms,
  getDocumentVersions,
  getMyDocuments,
  uploadDocument,
  type UploadedDocument,
} from '@/features/review-case/api/reviewCaseApi'
import { useCaseError } from '@/features/review-case/hooks/useReviewCases'
import { ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useCreditOverview } from '@/features/credits/hooks/useCreditOverview'
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

// The current tax year (00 section 3a); the client can pick another period before uploading
const TAX_YEAR = new Date().getFullYear()
// "2026-01-01" -> "01/01/2026"; a tax period is a calendar day, so no time zone is involved
const dayOf = (date: string) => date.split('-').reverse().join('/')

export default function ReviewRequestPage() {
  const { t } = useTranslation(['reviewCase', 'common'])
  const f = useCaseFormat()
  const id = useId()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const expertId = params.get('expert') ?? undefined
  const query = usePublicExpert(expertId)
  const bio = query.data
  const service = bio?.services.find(
    (s) => s.serviceId === params.get('service')
  )
  // The money rules this booking would freeze, shown before the client agrees and pays
  const terms = useQuery({
    queryKey: ['private', 'client', 'booking-terms', expertId, service?.serviceId],
    queryFn: ({ signal }) =>
      getBookingTerms(expertId!, service!.serviceId, signal),
    enabled: !isExpertDemo && Boolean(expertId && service),
  }).data

  const documentId = params.get('document')
  // The draft handoff and Marketplace pass the version as draftVersion; version is kept for older links
  const versionId = params.get('draftVersion') ?? params.get('version')
  const [uploaded, setUploaded] = useState<(UploadedDocument & { name: string }) | null>(null)
  const myDocuments = useQuery({
    queryKey: ['my-documents'],
    queryFn: ({ signal }) => getMyDocuments(signal),
    enabled: !isExpertDemo,
  }).data
  const picked = [
    ...(documentId && versionId
      ? [{ id: versionId, documentId, name: t('live.chosenVersion') }]
      : []),
    ...(uploaded ? [uploaded] : []),
  ]
  // A listed document's radio value is its id; its version is looked up when the request is sent
  const listed = isExpertDemo
    ? []
    : (myDocuments ?? [])
        // A document already under review cannot be booked again (CASE_ALREADY_OPEN)
        .filter(
          (d) =>
            d.status !== 'IN_REVIEW' &&
            !picked.some((p) => p.documentId === d.id)
        )
        .map((d) => ({
          id: d.id,
          documentId: d.id,
          name: d.title,
          latest: true,
          doc: d,
        }))
  const drafts = isExpertDemo ? REVIEWABLE_DRAFTS : [...picked, ...listed]
  const [docQuery, setDocQuery] = useState('')
  const shownListed = listed.filter((d) =>
    d.name.toLowerCase().includes(docQuery.trim().toLowerCase())
  )
  const [periodStart, setPeriodStart] = useState(`${TAX_YEAR}-01-01`)
  const [periodEnd, setPeriodEnd] = useState(`${TAX_YEAR}-12-31`)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const toMessage = useCaseError()
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string>(drafts[0]?.id ?? '')
  // A listed document loads its versions once chosen; the client picks one, the newest is preselected
  const chosenListed = listed.find((d) => d.id === draftId)
  const versions = useQuery({
    queryKey: ['private', 'document-versions', chosenListed?.documentId],
    queryFn: ({ signal }) => getDocumentVersions(chosenListed!.documentId, signal),
    enabled: chosenListed != null,
  }).data
  const [pickedVersions, setPickedVersions] = useState<Record<string, string>>({})
  const chosenVersion = chosenListed
    ? (pickedVersions[chosenListed.documentId] ?? versions?.[0]?.id)
    : undefined
  const [scope, setScope] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const draftError = submitted && !draftId
  const consentError = submitted && !consent
  const scopeError = !isExpertDemo && submitted && !scope.trim()
  // Billing holds the fee from this wallet balance, so the client sees it before sending
  const credits = useCreditOverview()
  const fee = service?.price == null ? null : Number(service.price)
  const balance = isExpertDemo ? undefined : credits.data?.wallet.balance
  const remaining = balance != null && fee != null ? balance - fee : null
  const shortfall = remaining != null && remaining < 0

  usePageTitle(t('request.title'))

  // The uploaded file becomes version 1 of a new document and is chosen for this request
  const upload = (file: File | undefined) => {
    if (!file) return
    setUploadError(null)
    if (file.size > MAX_BYTES)
      return setUploadError(t('errors.ATTACHMENT_TOO_LARGE'))
    setUploading(true)
    uploadDocument(file, file.name.slice(0, 200), periodStart, periodEnd)
      .then((v) => {
        setUploaded({ id: v.id, documentId: v.documentId, name: file.name })
        setDraftId(v.id)
      })
      .catch((err: unknown) => setUploadError(toMessage(err)))
      .finally(() => setUploading(false))
  }

  // One document per request: a drop of several files takes the first
  const drop = useFileDrop(
    (files) => upload(files[0]),
    uploading || !periodStart || !periodEnd
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!draftId || !consent || shortfall) return
    if (isExpertDemo) return navigate(`/cases/${DEMO_CASES[0].id}`)
    const chosen = drafts.find((d) => d.id === draftId)
    const chosenDocument =
      chosen && 'documentId' in chosen ? chosen.documentId : null
    if (!scope.trim() || sending || !chosenDocument || !expertId || !service)
      return
    // A listed document still loading its versions waits; one with none cannot be booked
    if (chosenListed && !versions) return
    const sourceVersionId = chosenListed ? chosenVersion : draftId
    if (!sourceVersionId) return setSendError(t('request.noVersion'))
    setSending(true)
    setSendError(null)
    createReviewCase({
      documentId: chosenDocument,
      sourceVersionId,
      expertProfileId: expertId,
      serviceCode: service.serviceId,
      problemDescription: scope.trim(),
      expectedOutcome: null,
      expectedFee: service.price == null ? null : Number(service.price),
    })
      .then((c) => navigate(`/cases/${c.id}`))
      .catch((err: unknown) => {
        // The expert changed the price meanwhile: show the new one so the client can send again
        if (err instanceof ApiError && err.code === 'PRICE_CHANGED')
          void query.refetch()
        setSendError(toMessage(err))
        setSending(false)
      })
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
          <h1 className="text-h1 mb-8 font-serif">{t('request.title')}</h1>
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
                {drafts.length === 0 ? (
                  <div className="border-border-control rounded-surface border border-dashed p-6 text-center">
                    <p className="text-fg-muted">{t('request.noDrafts')}</p>
                    <Link to="/drafts" className="btn btn-secondary mt-4">
                      <FilePlus2 size={16} aria-hidden="true" />
                      {t('request.noDraftsCta')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drafts.filter((d) => !('latest' in d)).map((d) => (
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
                          {'aiDraft' in d && (
                            <>
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
                            </>
                          )}
                        </span>
                      </label>
                    ))}
                    {listed.length > 0 && (
                      // The client's own documents: one compact, scrollable box instead of a card each
                      <div className="rounded-surface border-border border">
                        <div className="border-border-subtle flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                          <span className="text-fg-strong text-sm font-semibold">
                            {t('request.myDocs.title')}{' '}
                            <span className="text-fg-muted num font-normal">
                              ({listed.length})
                            </span>
                          </span>
                          {listed.length > 5 && (
                            <input
                              type="search"
                              value={docQuery}
                              onChange={(e) => setDocQuery(e.target.value)}
                              placeholder={t('request.myDocs.search')}
                              aria-label={t('request.myDocs.search')}
                              className={cn(fieldClass, 'w-full py-1.5 text-sm sm:w-56')}
                            />
                          )}
                        </div>
                        <ul className="divide-border-subtle max-h-72 divide-y overflow-y-auto">
                          {shownListed.map((d) => (
                            <li key={d.id}>
                              <label
                                className={cn(
                                  'flex cursor-pointer items-center gap-3 border-l-2 px-4 py-2.5 transition-colors',
                                  draftId === d.id
                                    ? 'border-ink bg-sunken'
                                    : 'hover:bg-sunken border-transparent'
                                )}
                              >
                                <input
                                  type="radio"
                                  name="draft"
                                  value={d.id}
                                  checked={draftId === d.id}
                                  onChange={() => setDraftId(d.id)}
                                  className="accent-ink size-4 shrink-0"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="text-fg-strong block truncate text-sm font-medium">
                                    {d.name}
                                  </span>
                                  <span className="text-fg-muted num block text-xs">
                                    {t(
                                      d.doc.source === 'TEMPLATE'
                                        ? 'request.myDocs.ai'
                                        : 'request.myDocs.upload'
                                    )}
                                    {d.doc.periodStart &&
                                      d.doc.periodEnd &&
                                      ` · ${t('request.myDocs.period', {
                                        from: dayOf(d.doc.periodStart),
                                        to: dayOf(d.doc.periodEnd),
                                      })}`}
                                  </span>
                                </span>
                              </label>
                              {draftId === d.id && versions && versions.length > 1 && (
                                <div className="bg-sunken border-ink border-l-2 px-4 pb-3 pl-11">
                                  <label
                                    htmlFor={`${id}-version`}
                                    className="text-fg-muted block text-xs"
                                  >
                                    {t('request.myDocs.version')}
                                  </label>
                                  <select
                                    id={`${id}-version`}
                                    value={chosenVersion}
                                    onChange={(e) =>
                                      setPickedVersions((picked) => ({
                                        ...picked,
                                        [d.documentId]: e.target.value,
                                      }))
                                    }
                                    className={cn(fieldClass, 'mt-1 py-1.5 text-sm')}
                                  >
                                    {versions.map((v, i) => (
                                      <option key={v.id} value={v.id}>
                                        {t('request.myDocs.versionOption', {
                                          no: v.versionNo,
                                          // AI_DRAFT, EXTERNAL_FILE or EXPERT_REVIEWED (DocumentVersion.VersionType)
                                          kind: t(
                                            v.versionType === 'EXTERNAL_FILE'
                                              ? 'request.myDocs.upload'
                                              : v.versionType === 'EXPERT_REVIEWED'
                                                ? 'request.myDocs.expertReviewed'
                                                : 'request.myDocs.ai'
                                          ),
                                          at: f.at(v.createdAt),
                                        })}
                                        {i === 0 ? ` · ${t('request.myDocs.newest')}` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {draftId === d.id && versions?.length === 0 && (
                                <p className="text-danger bg-sunken border-ink border-l-2 px-4 pb-3 pl-11 text-xs">
                                  {t('request.noVersion')}
                                </p>
                              )}
                            </li>
                          ))}
                          {shownListed.length === 0 && (
                            <li className="text-fg-muted px-4 py-3 text-sm">
                              {t('request.myDocs.none')}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!isExpertDemo && (
                  <div className="mt-4 space-y-3">
                    <p className="text-fg-strong text-sm font-semibold">
                      {t('request.upload.title')}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-fg text-sm">
                        {t('request.upload.periodStart')}
                        <input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className={cn(fieldClass, 'mt-1')}
                        />
                      </label>
                      <label className="text-fg text-sm">
                        {t('request.upload.periodEnd')}
                        <input
                          type="date"
                          value={periodEnd}
                          min={periodStart}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className={cn(fieldClass, 'mt-1')}
                        />
                      </label>
                    </div>
                    <label
                      {...drop.props}
                      className={cn(
                        'btn btn-secondary has-[:focus-visible]:outline-ink w-full cursor-pointer border-dashed has-[:focus-visible]:outline-2',
                        drop.over && 'border-accent bg-sunken'
                      )}
                    >
                      <Upload size={16} aria-hidden="true" />
                      {uploading
                        ? t('live.files.uploading')
                        : drop.over
                          ? t('live.files.dropHere')
                          : t('request.upload.pick')}
                      <input
                        type="file"
                        accept={ACCEPT}
                        disabled={uploading || !periodStart || !periodEnd}
                        aria-describedby={`${id}-upload-hint`}
                        onChange={(e) => {
                          upload(e.target.files?.[0])
                          e.target.value = ''
                        }}
                        className="sr-only"
                      />
                    </label>
                    <p id={`${id}-upload-hint`} className="text-fg-muted text-sm">
                      {t('request.upload.hint')}
                    </p>
                    {uploadError && (
                      <p role="alert" className="text-danger text-sm">
                        {uploadError}
                      </p>
                    )}
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
                  help={t('request.scopeHint')}
                  error={scopeError ? t('live.scopeRequired') : undefined}
                  errorId={`${id}-scope-error`}
                >
                  <textarea
                    id={`${id}-scope`}
                    rows={4}
                    maxLength={1000}
                    value={scope}
                    aria-invalid={scopeError}
                    aria-describedby={
                      scopeError ? `${id}-scope-error` : undefined
                    }
                    onChange={(e) => setScope(e.target.value)}
                    className={cn(fieldClass, 'resize-y')}
                  />
                </FormField>
                {isExpertDemo && (
                  <FormField
                    label={t('request.files')}
                    htmlFor={`${id}-files`}
                    help={t('request.filesHint')}
                  >
                    <FilePicker id={`${id}-files`} />
                  </FormField>
                )}
              </div>

              {terms && (
                <section
                  aria-labelledby={`${id}-terms`}
                  className="bg-sunken rounded-control mb-4 p-4 text-sm"
                >
                  <h3 id={`${id}-terms`} className="text-fg-strong font-semibold">
                    {t('request.terms.title')}
                  </h3>
                  <ul className="text-fg mt-2 list-disc space-y-1 pl-5">
                    <li>
                      {t('request.terms.late', {
                        hours: terms.latePenaltyHours,
                        amount: f.money(terms.lateRefund),
                      })}
                    </li>
                    <li>
                      {t('request.terms.noDelivery', {
                        amount: f.money(terms.noDeliveryRefund),
                      })}
                    </li>
                    <li className="text-warning font-semibold">
                      {terms.noResponseRefund > 0
                        ? t('request.terms.noResponseRefund', {
                            days: terms.noResponseDays,
                            amount: f.money(terms.noResponseRefund),
                          })
                        : t('request.terms.noResponseNoRefund', {
                            days: terms.noResponseDays,
                          })}
                    </li>
                    <li>
                      {t('request.terms.dispute', {
                        amount: f.money(terms.disputeRefund),
                      })}
                    </li>
                  </ul>
                </section>
              )}
              {/* Escrow terms come before the consent they are part of */}
              <p className="text-fg mt-8 mb-4 flex items-start gap-2 text-sm">
                <ShieldCheck
                  size={16}
                  aria-hidden="true"
                  className="text-success mt-0.5 shrink-0"
                />
                {t('request.lead')}
              </p>
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

              {sendError && (
                <p role="alert" className="text-danger mt-4 text-sm">
                  {sendError}
                </p>
              )}
              {shortfall && remaining != null && (
                <p
                  id={`${id}-shortfall`}
                  role="alert"
                  className="text-danger mt-8 text-sm"
                >
                  {t('request.shortfall', { amount: f.money(-remaining) })}{' '}
                  <Link to="/wallet" className="font-semibold underline">
                    {t('request.toWallet')}
                  </Link>
                </p>
              )}
              <button
                type="submit"
                disabled={sending || shortfall}
                aria-busy={sending}
                aria-describedby={shortfall ? `${id}-shortfall` : undefined}
                className="btn btn-press btn-primary mt-8 disabled:opacity-60 max-sm:w-full"
              >
                {sending
                  ? t('request.sending')
                  : fee == null
                    ? t('request.submit')
                    : t('request.submitHold', { amount: f.money(fee) })}
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
                  {balance != null && fee != null && remaining != null && (
                    <>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-fg-muted">
                          {t('request.balance')}
                        </dt>
                        <dd className="num text-fg-strong">
                          {f.money(balance)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-fg-muted">{t('request.hold')}</dt>
                        <dd className="num text-fg-strong">
                          {'\u2212'}
                          {f.money(fee)}
                        </dd>
                      </div>
                      <div className="border-border-subtle flex items-baseline justify-between gap-4 border-t pt-3">
                        <dt className="text-fg-strong font-semibold">
                          {t('request.remaining')}
                        </dt>
                        <dd
                          className={cn(
                            'num font-semibold',
                            shortfall ? 'text-danger' : 'text-fg-strong'
                          )}
                        >
                          {f.money(remaining)}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </section>

              <section
                aria-labelledby="req-next"
                className="border-border border-t pt-5"
              >
                <div className="flex items-center gap-2">
                  <h2 id="req-next" className="eyebrow font-sans">
                    {t('request.nextTitle')}
                  </h2>
                  <HelpTip label={t('request.workingDaysLabel')}>
                    {t('request.workingDays')}
                  </HelpTip>
                </div>
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
