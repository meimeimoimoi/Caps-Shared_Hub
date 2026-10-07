import { DraftUiError } from '@/features/drafting/utils/DraftUiError'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { draftApi } from '../api/draftApi'
import { useDraftAction } from '../hooks/useDrafting'
import { DraftButton, DraftError, DraftLink, ReadinessBadge } from './DraftUi'

import type { DraftVersion } from '../types'

export function ReadinessPanel({
  draft,
  onCitation,
}: {
  draft: DraftVersion
  onCitation: (id: string) => void
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const key = useRef(crypto.randomUUID())
  const retry = useDraftAction((_: void, ctx) =>
    draftApi.assess(draft.id, key.current, ctx)
  )
  return (
    <section aria-labelledby="readiness-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="readiness-heading" className="text-h2">
          {t('readiness')}
        </h2>
        <ReadinessBadge assessment={draft.assessment} />
      </div>
      <p className="text-caption text-fg-muted mt-3">
        {t('readinessIsNotExpertApproval')}{' '}
        {draft.assessment.assessedAt &&
          t('assessedTime', {
            time: display.timestamp(draft.assessment.assessedAt),
          })}
      </p>
      {draft.assessment.status === 'PENDING' && (
        <div
          role="status"
          className="rounded-control bg-warning-soft text-warning mt-4 p-4 text-sm"
        >
          {t(
            'assessmentIsPendingControlledActionsRemainUnavailableReturnLaterOrRefreshThisVersionToCheckItsStatus'
          )}
        </div>
      )}
      {draft.assessment.status === 'FAILED' && (
        <div className="mt-4 space-y-3">
          <DraftError error={new DraftUiError('assessmentFailed')} />
          <DraftButton
            secondary
            disabled={retry.isPending}
            onClick={() => retry.mutate(undefined)}
          >
            {t('retryAssessment')}
          </DraftButton>
          {retry.isError && <DraftError error={retry.error} />}
        </div>
      )}
      <dl className="divide-border mt-5 divide-y">
        {draft.assessment.checks.map((check) => (
          <div key={check.label} className="py-2 text-sm">
            <dt className="font-medium">{display.demoCopy(check.label)}</dt>
            <dd className="text-fg-muted">{display.demoCopy(check.result)}</dd>
          </div>
        ))}
      </dl>
      {draft.assessment.issues.map((issue) => (
        <article
          key={issue.id}
          className={`rounded-control mt-4 border p-4 text-sm ${issue.severity === 'blocking' ? 'border-danger/30 bg-danger-soft text-danger' : 'border-warning/30 bg-warning-soft text-warning'}`}
        >
          <strong>
            {issue.severity === 'blocking' ? t('blockingIssue') : t('warning')}
          </strong>
          <p className="mt-2">{display.demoCopy(issue.message)}</p>
          <p className="mt-2">{display.demoCopy(issue.guidance)}</p>
          {issue.fieldId && (
            <DraftLink
              to={`/drafts/${draft.workspaceId}/input?fromVersion=${draft.id}&field=${issue.fieldId}`}
            >
              {t('reviseRelatedInput')}
            </DraftLink>
          )}
          {issue.citationId && (
            <button
              className="mt-3 min-h-11 underline"
              onClick={() => onCitation(issue.citationId!)}
            >
              {t('inspectCitation')}
            </button>
          )}
        </article>
      ))}
    </section>
  )
}
