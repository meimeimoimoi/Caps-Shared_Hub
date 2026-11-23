import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Clock,
  Eye,
  FileText,
  RotateCcw,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useFieldLabel } from '../hooks/useLabels'
import type {
  ApplicationDocument,
  ScreeningPoint,
  ScreeningRun,
  ScreeningRunStatus,
} from '../types'
import { documentKey, formatDateTime } from '../utils/applications'

interface AiScreeningTabProps {
  screening: ScreeningRun
  documents: ApplicationDocument[]
  canResolve: boolean
  busy: boolean
  onResolveChecked: (pointId: string, reason: string) => Promise<unknown>
  onUseForSupplement: (point: ScreeningPoint) => Promise<unknown>
  onReopenPoint: (pointId: string) => Promise<unknown>
  onRetry: () => Promise<unknown>
  onAssignSupplementGroup: (
    evidenceId: string,
    groupCode: string | null
  ) => Promise<unknown>
  onOpenDocument: (key: string) => void
}

const runStatusTone: Record<ScreeningRunStatus, string> = {
  RUNNING: 'bg-accent/10 text-accent-text',
  COMPLETED: 'bg-success/10 text-success',
  FAILED: 'bg-danger/10 text-danger',
  SKIPPED: 'bg-surface-muted text-text-muted',
}

const extractionStatusKey = {
  PENDING: 'detail.aiScreening.extractionStatus.PENDING',
  PROCESSING: 'detail.aiScreening.extractionStatus.PROCESSING',
  EXTRACTED: 'detail.aiScreening.extractionStatus.EXTRACTED',
  UNREADABLE: 'detail.aiScreening.extractionStatus.UNREADABLE',
  FAILED: 'detail.aiScreening.extractionStatus.FAILED',
} as const

const docTypeKey = {
  CV: 'detail.aiScreening.docTypes.CV',
  TAX_CERTIFICATE: 'detail.aiScreening.docTypes.TAX_CERTIFICATE',
  TRAINING_CERTIFICATE: 'detail.aiScreening.docTypes.TRAINING_CERTIFICATE',
  OTHER: 'detail.aiScreening.docTypes.OTHER',
} as const

const isKnownKey = <T extends Record<string, string>>(
  map: T,
  key: string
): key is keyof T & string => Object.hasOwn(map, key)

const GROUP_OPTIONS = ['CV', 'EV-01', 'EV-02', 'EV-03', 'EV-04', 'EV-05'] as const

export function AiScreeningTab({
  screening,
  documents,
  canResolve,
  busy,
  onResolveChecked,
  onUseForSupplement,
  onReopenPoint,
  onRetry,
  onAssignSupplementGroup,
  onOpenDocument,
}: AiScreeningTabProps) {
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const [checkingPointId, setCheckingPointId] = useState<string | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const totalPoints = screening.points.length
  const resolvedCount = screening.points.filter((p) => p.status !== 'OPEN').length

  const findDocKey = (evidenceId: string | null) => {
    if (!evidenceId) return null
    const doc = documents.find((d) => d.evidenceId === evidenceId)
    return doc ? documentKey(doc) : null
  }

  const startChecking = (pointId: string) => {
    setCheckingPointId(pointId)
    setReasonDraft('')
    setReasonError(null)
  }

  const submitChecked = async (pointId: string) => {
    const trimmed = reasonDraft.trim()
    if (!trimmed) {
      setReasonError(t('detail.aiScreening.reasonRequired'))
      return
    }
    setReasonError(null)
    await onResolveChecked(pointId, trimmed)
    setCheckingPointId(null)
    setReasonDraft('')
  }

  return (
    <div className="space-y-6">
      <section className="paper p-5">
        <div className="para-ai">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h2">{t('detail.aiScreening.results')}</h2>
              <HelpTip label={t('detail.aiScreening.helpLabel')}>
                {t('detail.aiScreening.help')}
              </HelpTip>
              <span className="badge-ai">AI</span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  runStatusTone[screening.status]
                )}
              >
                {t(`detail.aiScreening.runStatus.${screening.status}`)}
              </span>
            </div>
            {screening.canRetry && canResolve && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRetry()}
                className="btn btn-press btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <RotateCcw size={14} aria-hidden="true" />
                {t('detail.aiScreening.retry')}
              </button>
            )}
          </div>

          <div className="text-fg-muted mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="num">
              {t('detail.aiScreening.runMeta', {
                submission: screening.submissionNumber,
                run: screening.runNumber,
                time: formatDateTime(screening.startedAt),
              })}
            </span>
            {screening.completedAt && (
              <span className="num">
                {t('detail.aiScreening.finishedAt', {
                  time: formatDateTime(screening.completedAt),
                })}
              </span>
            )}
          </div>

          {screening.status === 'RUNNING' && (
            <p className="bg-surface-muted text-text mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              <Clock size={15} aria-hidden="true" className="shrink-0" />
              {t('detail.aiScreening.runningNotice')}
            </p>
          )}
          {screening.status === 'FAILED' && (
            <p className="border-danger/30 bg-danger/10 text-danger mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
              {t('detail.aiScreening.failedNotice')}
            </p>
          )}
          {screening.status === 'SKIPPED' && (
            <p className="bg-surface-muted text-text-muted mt-3 rounded-md px-3 py-2 text-sm">
              {t('detail.aiScreening.skippedNotice')}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              {t('detail.aiScreening.checked', {
                count: screening.checkedFileCount,
              })}
            </span>
            {screening.openPointCount > 0 && (
              <span className="text-warning inline-flex items-center gap-1.5 font-medium">
                <TriangleAlert size={14} aria-hidden="true" />
                {t('detail.aiScreening.flags', {
                  count: screening.openPointCount,
                })}
              </span>
            )}
            <span className="text-fg-muted">
              {t('detail.aiScreening.reviewedCount', {
                done: resolvedCount,
                total: totalPoints,
              })}
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="screening-points-heading" className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 id="screening-points-heading" className="text-fg-strong font-semibold">
            {t('detail.aiScreening.pointsTitle')}
          </h3>
          <HelpTip label={t('detail.aiScreening.pointsTitle')}>
            {t('detail.aiScreening.pointsHelp')}
          </HelpTip>
        </div>

        {screening.points.length === 0 ? (
          <p className="border-border text-text-muted rounded-lg border border-dashed px-4 py-4 text-sm">
            {t('detail.aiScreening.noPoints')}
          </p>
        ) : (
          <ul className="space-y-3">
            {screening.points.map((point) => {
              const docKey = findDocKey(point.evidenceId)
              const isOpen = point.status === 'OPEN'
              const isEditingReason = checkingPointId === point.id

              return (
                <li
                  key={point.id}
                  className={cn(
                    'rounded-lg border p-4',
                    isOpen
                      ? 'border-warning/40 bg-warning/5'
                      : 'border-border bg-surface'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          point.source === 'AI'
                            ? 'badge-ai'
                            : 'bg-surface-muted text-text-strong'
                        )}
                      >
                        {t(`detail.aiScreening.source.${point.source}`)}
                      </span>
                      {point.evidenceCode && (
                        <span className="bg-surface-muted text-text-muted rounded px-1.5 py-0.5 text-xs font-medium">
                          {point.evidenceCode}
                        </span>
                      )}
                      {point.targetCriterion &&
                        point.targetCriterion !== point.evidenceCode && (
                          <span className="bg-surface-muted text-text-muted rounded px-1.5 py-0.5 text-xs font-medium">
                            {point.targetCriterion}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {docKey && (
                        <button
                          type="button"
                          onClick={() => onOpenDocument(docKey)}
                          className="text-text-strong inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
                        >
                          <Eye size={13} aria-hidden="true" />
                          {t('detail.documents.view')}
                        </button>
                      )}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          isOpen
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/10 text-success'
                        )}
                      >
                        {t(`detail.aiScreening.pointStatus.${point.status}`)}
                      </span>
                    </div>
                  </div>

                  <p className="text-text-strong mt-2 flex items-center gap-2 text-sm font-semibold">
                    {isOpen ? (
                      <TriangleAlert
                        size={15}
                        aria-hidden="true"
                        className="text-warning shrink-0"
                      />
                    ) : (
                      <Check
                        size={15}
                        aria-hidden="true"
                        className="text-success shrink-0"
                      />
                    )}
                    {point.title}
                  </p>
                  <p className="text-text mt-1 pl-6 text-sm leading-6">
                    {point.detail}
                  </p>

                  {point.code === 'SYS_UNCLASSIFIED_SUPPLEMENT' &&
                    point.evidenceId &&
                    canResolve &&
                    isOpen && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                        <label className="text-text-muted text-xs font-medium">
                          {t('detail.aiScreening.assignGroupLabel')}
                          <select
                            defaultValue=""
                            disabled={busy}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value)
                                void onAssignSupplementGroup(
                                  point.evidenceId!,
                                  value
                                )
                            }}
                            className="border-border-control bg-paper text-text-strong ml-2 rounded-md border px-2 py-1 text-xs"
                          >
                            <option value="">
                              {t('detail.aiScreening.chooseGroup')}
                            </option>
                            {GROUP_OPTIONS.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                  {!isOpen && point.resolutionReason && (
                    <div className="bg-surface-muted mt-3 ml-6 rounded-md px-3 py-2 text-xs leading-5">
                      <span className="text-text-strong font-medium">
                        {t('detail.aiScreening.resolutionReason')}:{' '}
                      </span>
                      <span className="text-text whitespace-pre-line">
                        {point.resolutionReason}
                      </span>
                    </div>
                  )}

                  {canResolve && isOpen && !isEditingReason && (
                    <div className="mt-3 flex flex-wrap gap-2 pl-6">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startChecking(point.id)}
                        className="btn btn-press btn-secondary bg-paper text-sm"
                      >
                        {t('detail.aiScreening.markChecked')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onUseForSupplement(point)}
                        className="btn btn-press btn-ghost text-sm"
                      >
                        {t('detail.aiScreening.useForSupplement')}
                      </button>
                    </div>
                  )}

                  {canResolve && isOpen && isEditingReason && (
                    <div className="mt-3 space-y-2 pl-6">
                      <label className="text-text-strong block text-xs font-medium">
                        {t('detail.aiScreening.reasonLabel')}
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={reasonDraft}
                          onChange={(e) => setReasonDraft(e.target.value)}
                          placeholder={t('detail.aiScreening.reasonPlaceholder')}
                          className="border-border-control bg-paper text-text mt-1 block w-full resize-y rounded-md border px-3 py-2 text-sm"
                        />
                      </label>
                      {reasonError && (
                        <p className="text-danger text-xs">{reasonError}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void submitChecked(point.id)}
                          className="btn btn-press btn-primary text-sm"
                        >
                          {t('detail.aiScreening.confirmChecked')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setCheckingPointId(null)}
                          className="btn btn-press btn-ghost text-sm"
                        >
                          {t('detail.aiScreening.cancelAction')}
                        </button>
                      </div>
                    </div>
                  )}

                  {canResolve && !isOpen && (
                    <div className="mt-3 pl-6">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onReopenPoint(point.id)}
                        className="text-text-muted hover:text-text-strong inline-flex items-center gap-1 text-xs underline underline-offset-4"
                      >
                        <Undo2 size={12} aria-hidden="true" />
                        {t('detail.aiScreening.reopenPoint')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="extracted-facts-heading" className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 id="extracted-facts-heading" className="text-fg-strong font-semibold">
            {t('detail.aiScreening.extractedTitle')}
          </h3>
          <HelpTip label={t('detail.aiScreening.extractedTitle')}>
            {t('detail.aiScreening.extractedHelp')}
          </HelpTip>
        </div>

        {screening.extractions.length === 0 ? (
          <p className="border-border text-text-muted rounded-lg border border-dashed px-4 py-4 text-sm">
            {t('detail.aiScreening.noExtractions')}
          </p>
        ) : (
          <div className="space-y-3">
            {screening.extractions.map((ext) => {
              const docKey = findDocKey(ext.evidenceId)
              return (
                <article
                  key={ext.evidenceId}
                  className="border-border bg-surface rounded-lg border p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText
                        size={15}
                        aria-hidden="true"
                        className="text-text-muted shrink-0"
                      />
                      <span className="bg-surface-muted text-text-strong rounded px-1.5 py-0.5 text-xs font-medium">
                        {ext.evidenceCode}
                      </span>
                      {ext.assignedGroup && (
                        <span className="bg-accent/10 text-accent-text rounded px-1.5 py-0.5 text-xs font-medium">
                          → {ext.assignedGroup}
                        </span>
                      )}
                      <span className="text-text-strong truncate font-medium">
                        {ext.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {docKey && (
                        <button
                          type="button"
                          onClick={() => onOpenDocument(docKey)}
                          className="text-text-strong text-xs underline underline-offset-4"
                        >
                          {t('detail.documents.view')}
                        </button>
                      )}
                      <span className="bg-surface-muted text-text-muted rounded-full px-2 py-0.5 text-xs font-medium">
                        {isKnownKey(extractionStatusKey, ext.extractionStatus)
                          ? t(extractionStatusKey[ext.extractionStatus])
                          : ext.extractionStatus}
                      </span>
                    </div>
                  </div>

                  {ext.isUnreadable && (
                    <p className="text-warning mt-2 text-xs">
                      {t('detail.aiScreening.unreadableDetail', {
                        reason: ext.unreadableReason ?? 'UNREADABLE',
                      })}
                    </p>
                  )}

                  {ext.extractionStatus === 'EXTRACTED' && (
                    <dl className="divide-border-subtle mt-3 divide-y text-xs">
                      <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                        <dt className="text-fg-muted">
                          {t('detail.aiScreening.fieldFullName')}
                        </dt>
                        <dd className="text-text-strong">
                          {ext.fullName || '—'}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                        <dt className="text-fg-muted">
                          {t('detail.aiScreening.fieldDocType')}
                        </dt>
                        <dd className="text-text-strong">
                          {ext.documentType
                            ? isKnownKey(docTypeKey, ext.documentType)
                              ? t(docTypeKey[ext.documentType])
                              : ext.documentType
                            : '—'}
                        </dd>
                      </div>
                      {ext.derivedTaxYears != null && (
                        <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                          <dt className="text-fg-muted">
                            {t('detail.aiScreening.fieldDerivedYears')}
                          </dt>
                          <dd className="text-text-strong num font-medium">
                            {t('detail.meta.years', {
                              count: ext.derivedTaxYears,
                            })}
                          </dd>
                        </div>
                      )}
                      <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                        <dt className="text-fg-muted">
                          {t('detail.aiScreening.fieldDomains')}
                        </dt>
                        <dd className="text-text-strong">
                          {ext.fieldCodes.length
                            ? ext.fieldCodes.map(fieldLabel).join(', ')
                            : '—'}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                        <dt className="text-fg-muted">
                          {t('detail.aiScreening.fieldMilestones')}
                        </dt>
                        <dd className="text-text-strong">
                          {ext.workMilestones.length ? (
                            <ul className="space-y-1">
                              {ext.workMilestones.map((m, idx) => (
                                <li key={idx}>
                                  {[m.role, m.company].filter(Boolean).join(' · ') || '—'}{' '}
                                  <span className="text-fg-muted num">
                                    (
                                    {m.startMonth ? `${m.startMonth}/` : ''}
                                    {m.startYear ?? '?'} –{' '}
                                    {m.isCurrent
                                      ? t('detail.aiScreening.presentPeriod')
                                      : `${m.endMonth ? `${m.endMonth}/` : ''}${m.endYear ?? '?'}`}
                                    )
                                  </span>
                                  {m.isTaxAccounting && (
                                    <span className="bg-success/10 text-success ml-1.5 rounded px-1.5 py-0.5 text-[11px]">
                                      {t('detail.aiScreening.taxRelated')}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5">
                        <dt className="text-fg-muted">
                          {t('detail.aiScreening.fieldCertificates')}
                        </dt>
                        <dd className="text-text-strong">
                          {ext.certificates.length ? (
                            <ul className="space-y-1">
                              {ext.certificates.map((c, idx) => (
                                <li key={idx}>
                                  <span className="font-medium">
                                    {c.name || '—'}
                                  </span>
                                  {c.issuer && ` · ${c.issuer}`}
                                  {(c.issuedDate || c.expiryDate) && (
                                    <span className="text-fg-muted num ml-1">
                                      ({c.issuedDate ?? '?'} →{' '}
                                      {c.expiryDate ?? '—'})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
