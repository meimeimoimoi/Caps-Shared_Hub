import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { DraftButton } from './DraftUi'
import type { Citation } from '../types'
import { safeSourceUrl } from '../utils/sourceUrl'
export function CitationDetails({
  citation,
  onClose,
}: {
  citation: Citation
  onClose: () => void
}) {
  const { t } = useTranslation('drafting')

  const link = safeSourceUrl(citation.url)
  return (
    <Modal
      title={t('sourceDetails')}
      closeLabel={t('closeSourceDetails')}
      onClose={onClose}
      footer={
        <DraftButton secondary onClick={onClose}>
          {t('close')}
        </DraftButton>
      }
    >
      <h3 className="mt-5 font-semibold">{citation.sourceTitle}</h3>
      {citation.synthetic && (
        <p className="rounded-control bg-warning-soft text-warning mt-3 p-3 text-sm">
          {t('syntheticDemonstrationSourceThisIsNotVerifiedLegalKnowledge')}
        </p>
      )}
      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="font-semibold">{t('sourceVersion')}</dt>
          <dd>{citation.sourceVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('knowledgeVersion')}</dt>
          <dd>{citation.knowledgeVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('applicability')}</dt>
          <dd>{citation.applicability}</dd>
        </div>
      </dl>
      {citation.available ? (
        <>
          <blockquote className="border-border mt-5 border-y py-4 text-sm">
            {citation.excerpt}
          </blockquote>
          {link && (
            <a
              className="text-accent-text mt-4 inline-flex min-h-11 items-center underline"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openSource')}
            </a>
          )}
        </>
      ) : (
        <p
          role="alert"
          className="rounded-control bg-danger-soft text-danger mt-5 p-4 text-sm"
        >
          {t(
            'thisSourceIsUnavailableOrAccessIsRestrictedItsContentsCannotCurrentlyBeVerified'
          )}
        </p>
      )}
    </Modal>
  )
}
