import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { DraftButton, DraftLink } from './DraftUi'

import type { SchemaField, Snapshot } from '../types'
import { useHistory } from '../hooks/useDrafting'

export function InputSummary({
  input,
  fields,
}: {
  input: Record<string, string>
  fields: SchemaField[]
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  return (
    <dl className="divide-border mt-4 divide-y">
      {fields.map((field) => (
        <div key={field.id} className="py-3">
          <dt className="text-caption text-fg-muted font-semibold">
            {field.label}
            {field.required ? ' · ' + t('required') : ''}
          </dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-wrap tabular-nums">
            {display.field(input[field.id], field)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
export function SnapshotDetails({
  snapshot,
  fields,
  onClose,
}: {
  snapshot: Snapshot
  fields: SchemaField[]
  onClose: () => void
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const history = useHistory(snapshot.workspaceId)
  return (
    <Modal
      title={t('snapshotDialogTitle', {
        version: display.number(snapshot.version),
      })}
      closeLabel={t('closeSnapshotDetails')}
      description={t('snapshotDialogDescription', {
        time: display.timestamp(snapshot.confirmedAt),
        template: snapshot.templateVersionId,
      })}
      onClose={onClose}
      footer={
        <>
          <DraftLink
            to={`/drafts/${snapshot.workspaceId}/input?fromSnapshot=${snapshot.id}`}
          >
            {t('reviseThisSnapshot')}
          </DraftLink>
          <DraftButton secondary onClick={onClose}>
            {t('close')}
          </DraftButton>
        </>
      }
    >
      <InputSummary input={snapshot.input} fields={fields} />
      <h3 className="mt-5 font-semibold">{t('draftsFromThisSnapshot')}</h3>
      {history.isPending ? (
        <p role="status" className="mt-2 text-sm">
          {t('loadingRelatedDrafts')}
        </p>
      ) : history.isError ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {t('relatedDraftHistoryCouldNotBeLoaded')}
        </p>
      ) : (
        <ul>
          {history.data
            ?.filter((draft) => draft.snapshotId === snapshot.id)
            .map((draft) => (
              <li key={draft.id}>
                <DraftLink
                  to={`/drafts/${snapshot.workspaceId}/versions/${draft.id}`}
                >
                  {t('draftVersion', {
                    version: display.number(draft.version),
                  })}
                </DraftLink>
              </li>
            ))}
        </ul>
      )}
    </Modal>
  )
}
