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
  const link = safeSourceUrl(citation.url)
  return (
    <Modal
      title="Source details"
      closeLabel="Close source details"
      onClose={onClose}
      footer={
        <DraftButton secondary onClick={onClose}>
          Close
        </DraftButton>
      }
    >
      <h3 className="mt-5 font-semibold">{citation.sourceTitle}</h3>
      {citation.synthetic && (
        <p className="rounded-control bg-warning-soft text-warning mt-3 p-3 text-sm">
          Synthetic demonstration source. This is not verified legal knowledge.
        </p>
      )}
      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="font-semibold">Source version</dt>
          <dd>{citation.sourceVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold">Knowledge version</dt>
          <dd>{citation.knowledgeVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold">Applicability</dt>
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
              Open source
            </a>
          )}
        </>
      ) : (
        <p
          role="alert"
          className="rounded-control bg-danger-soft text-danger mt-5 p-4 text-sm"
        >
          This source is unavailable or access is restricted. Its contents
          cannot currently be verified.
        </p>
      )}
    </Modal>
  )
}
