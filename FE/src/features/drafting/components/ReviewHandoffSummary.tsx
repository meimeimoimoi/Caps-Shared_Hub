import { isDraftMock } from '../api/dataSource'
import { DraftUiError } from '@/features/drafting/utils/DraftUiError'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/feedback/modal'
import { draftApi, draftCapabilities } from '../api/draftApi'
import { useDraftAction } from '../hooks/useDrafting'
import { DraftButton, DraftError, ReadinessBadge } from './DraftUi'
import type { DraftVersion, ReviewReceipt } from '../types'

export function ReviewHandoffSummary({
  draft,
  open,
  onClose,
}: {
  draft: DraftVersion
  open: boolean
  onClose: () => void
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const key = useRef(crypto.randomUUID())
  const [receipt, setReceipt] = useState<ReviewReceipt | null>(null)
  const mutation = useDraftAction(async (_: void, ctx) => {
    const result = await draftApi.review(draft.id, key.current, ctx)
    if (result.draftVersionId !== draft.id)
      throw new DraftUiError(
        'theHandoffReceiptDoesNotMatchTheSelectedDraftVersion'
      )
    return result
  })
  if (!open) return null
  return (
    <Modal
      title={t('reviewHandoffSummary')}
      closeLabel={t('closeReviewSummary')}
      description={t(
        'theSelectedVersionAndItsReferencesWillBeHandedOverTogetherANewerDraftDoesNotReplaceThisPackage'
      )}
      preventClose={mutation.isPending}
      onClose={onClose}
      footer={
        <>
          <DraftButton
            secondary
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t('close')}
          </DraftButton>
          {!receipt && (
            <DraftButton
              disabled={
                mutation.isPending ||
                !draft.actions.review.allowed ||
                draft.assessment.status !== 'COMPLETED' ||
                !draftCapabilities.review
              }
              onClick={() =>
                mutation.mutate(undefined, { onSuccess: setReceipt })
              }
            >
              {mutation.isPending
                ? t('preparingHandoff')
                : t('confirmDemoHandoff')}
            </DraftButton>
          )}
        </>
      }
    >
      <dl className="mt-5 space-y-4 text-sm break-words">
        <div>
          <dt className="font-semibold">{t('draft')}</dt>
          <dd>
            {t('version')}
            {draft.version} · {draft.id}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">{t('confirmedSnapshot')}</dt>
          <dd>{draft.snapshotId}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('templateVersion')}</dt>
          <dd>{draft.templateVersionId}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('sourcesAndKnowledgeVersions')}</dt>
          <dd>
            {draft.citations.length
              ? draft.citations.map((citation) => (
                  <p key={citation.id}>
                    {citation.sourceVersion} · {citation.knowledgeVersion}
                  </p>
                ))
              : t('noSourceReferencesAvailable')}
          </dd>
        </div>
        <div>
          <dt className="mb-2 font-semibold">{t('readiness')}</dt>
          <dd>
            <ReadinessBadge assessment={draft.assessment} />
          </dd>
        </div>
      </dl>
      <p className="rounded-control bg-sunken mt-5 p-4 text-sm">
        {t(
          'thisBoundaryDoesNotBookAnExpertSendNotificationsOrTakePaymentNoSupportingDocumentsAreRequiredByTheCurrentDemoSchema'
        )}
      </p>
      {!draftCapabilities.review && (
        <p className="text-fg-muted mt-4 text-sm">
          {t(
            'expertReviewIntegrationHasNotBeenConnectedThisPackageCannotBeSubmittedYet'
          )}
        </p>
      )}
      {!draft.actions.review.allowed && (
        <p className="text-danger mt-4 text-sm">
          {display.demoCopy(draft.actions.review.reason)}
        </p>
      )}
      {mutation.isError && (
        <div className="mt-4">
          <DraftError error={mutation.error} />
        </div>
      )}
      {receipt && (
        <p
          role="status"
          className="rounded-control bg-success-soft text-success mt-4 p-4 text-sm"
        >
          {isDraftMock &&
          receipt.message ===
            `Demo handoff recorded for Draft v${draft.version} and Snapshot ${draft.snapshotId}. No expert booking, notification or payment was created.`
            ? t('demoHandoffReceipt', {
                version: display.number(draft.version),
                snapshot: draft.snapshotId,
              })
            : receipt.message}
        </p>
      )}
    </Modal>
  )
}
