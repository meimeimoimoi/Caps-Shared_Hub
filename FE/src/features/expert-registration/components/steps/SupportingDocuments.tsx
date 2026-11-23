import { useState } from 'react'
import { Modal } from '@/components/ui/feedback/modal'
import type { Declaration } from '../../api/applicationApi'
import { Trans, useTranslation } from 'react-i18next'
import {
  Circle,
  CircleCheck,
  CircleDashed,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  LockKeyhole,
} from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useFormatters } from '@/hooks/useFormatters'
import { criteria, criterionKey, DECLARED_CRITERIA } from '../../constants'
import { evidenceCode } from '../../api/applicationApi'
import { FileUploader } from '../FileUploader'
import type { EvidenceFile, UploadQuota } from '../../types'

/** Plain-language meaning of each evidence group (EV-01…EV-05, business overview) */
const CRITERION_HELP = {
  'criteria.legal': 'criteriaHelp.legal',
  'criteria.qualifications': 'criteriaHelp.qualifications',
  'criteria.development': 'criteriaHelp.development',
  'criteria.ethics': 'criteriaHelp.ethics',
  'criteria.confidentiality': 'criteriaHelp.confidentiality',
} as const

export interface SupportingDocumentsProps {
  /** Server codes of the groups that must hold a file or link before submitting (e.g. EV-01) */
  requiredEvidence: string[]
  declarations: Declaration[]
  agreed: string[]
  onAgreedChange: (code: string, value: boolean) => void
  activeCriterion: string
  formErrors: Record<string, string>
  files: Record<string, EvidenceFile[]>
  uploadQuota?: UploadQuota
  onCriterionSelect: (criterion: string) => void
  onFilesSelected: (criterion: string, files: FileList | null) => void
  onRemoveFile: (criterion: string, index: number) => void
  onAddLink: (criterion: string, url: string) => Promise<boolean>
}

export function SupportingDocuments({
  requiredEvidence,
  declarations,
  agreed,
  onAgreedChange,
  activeCriterion,
  formErrors,
  files,
  uploadQuota,
  onCriterionSelect,
  onFilesSelected,
  onRemoveFile,
  onAddLink,
}: SupportingDocumentsProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  const [showCommitment, setShowCommitment] = useState(false)
  const [readToEnd, setReadToEnd] = useState(false)
  const openCommitment = () => {
    setReadToEnd(false)
    setShowCommitment(true)
  }
  // Enables "agree" once the end of the text scrolls into view (at once when it all fits)
  const watchReadEnd = (node: HTMLDivElement | null) => {
    if (!node) return
    // Measured against the dialog's own scroll area, so text hidden below the fold never counts
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setReadToEnd(true)
      },
      { root: node.closest('.expert-commitment-body') }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }
  const conduct = declarations.find((d) => d.code === 'PROFESSIONAL_CONDUCT')
  const conductAgreed = !!conduct && agreed.includes(conduct.code)
  const documentCriteria = criteria.filter(
    (c) => !DECLARED_CRITERIA.includes(evidenceCode(c))
  )
  const selectedCriterion = documentCriteria.includes(activeCriterion)
    ? activeCriterion
    : documentCriteria[0]!
  const key = criterionKey(selectedCriterion)
  const title = key ? t(key) : selectedCriterion
  const helpKey = key ? CRITERION_HELP[key] : undefined
  const requiredGroups = criteria.filter((c) =>
    requiredEvidence.includes(evidenceCode(c))
  )
  // The shared commitment is one requirement on screen, though it covers two groups
  const completedGroups =
    requiredGroups.filter((c) => files[c]?.some((f) => !f.uploading)).length +
    (conductAgreed ? 1 : 0)
  const requiredTotal = requiredGroups.length + 1
  const isRequired = (criterion: string) =>
    requiredEvidence.includes(evidenceCode(criterion))
  // Ethics and confidentiality share one commitment accepted through the modal
  const isDeclared = (criterion: string) =>
    DECLARED_CRITERIA.includes(evidenceCode(criterion))

  return (
    <div className="expert-pro-documents">
      <p className="expert-pro-subtitle w-full !max-w-none">
        {t('documents.lead')}
      </p>

      <div className="expert-evidence-progress">
        <p className="expert-doc-nav-summary" role="status">
          {t('documents.groupsDone', {
            done: format.number(completedGroups),
            total: format.number(requiredTotal),
          })}
        </p>
        <progress
          className="expert-doc-nav-progress"
          value={completedGroups}
          max={requiredTotal}
          aria-label={t('documents.categories')}
        />
      </div>
      <div className="expert-evidence-section-label">
        <FileText size={18} aria-hidden="true" />
        <h3>{t('documents.sectionTitle')}</h3>
      </div>

      <div className="expert-pro-tabs-container">
        {/* Group navigation: one panel, a status mark and file count per group */}
        <nav className="expert-doc-nav" aria-label={t('documents.categories')}>
          <div className="expert-doc-nav-heading">
            <h3 className="text-sm font-semibold">
              {t('documents.navigationTitle')}
            </h3>
            <p className="text-ex-muted mt-1 text-xs">
              {t('documents.navigationHint')}
            </p>
          </div>
          <div
            className="expert-pro-tab-list"
            role="tablist"
            aria-label={t('documents.categories')}
          >
            {documentCriteria.map((c) => {
              const count = files[c]?.filter((f) => !f.uploading).length ?? 0
              const done = isDeclared(c) ? conductAgreed : count > 0
              const optional = !isRequired(c) && !isDeclared(c)
              return (
                <button
                  type="button"
                  key={c}
                  role="tab"
                  id={`evidence-tab-${criteria.indexOf(c)}`}
                  aria-controls="evidence-panel"
                  aria-selected={selectedCriterion === c}
                  className="expert-pro-tab"
                  data-has-files={done || undefined}
                  data-optional={optional || undefined}
                  aria-invalid={
                    !!formErrors[c] || (isDeclared(c) && !!formErrors.conduct)
                  }
                  onClick={() => onCriterionSelect(c)}
                >
                  <span className="expert-doc-nav-mark" aria-hidden="true">
                    {done ? (
                      <CircleCheck size={18} />
                    ) : optional ? (
                      <CircleDashed size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </span>
                  <span className="expert-doc-nav-label">
                    {t(criterionKey(c)!)}
                    {(isRequired(c) || isDeclared(c)) && (
                      <span aria-hidden="true"> *</span>
                    )}
                    {(isRequired(c) || isDeclared(c)) && (
                      <span className="sr-only">
                        {' '}
                        ({t('documents.required')})
                      </span>
                    )}
                  </span>
                  <span className="expert-doc-nav-count">
                    {isDeclared(c)
                      ? t(
                          conductAgreed
                            ? 'commitment.accepted'
                            : 'commitment.pending'
                        )
                      : count > 0
                        ? t('counts.file', { count })
                        : t(
                            isRequired(c)
                              ? 'documents.none'
                              : 'documents.optional'
                          )}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main Content Area */}
        <section
          key={selectedCriterion}
          id="evidence-panel"
          className="expert-pro-section expert-evidence-panel"
          role="tabpanel"
          aria-labelledby={`evidence-tab-${criteria.indexOf(selectedCriterion)}`}
        >
          <div className="expert-pro-section-header">
            <h3 className="expert-pro-section-title">{title}</h3>
            {/* What this group needs (EV-01…EV-05); accepted document types follow the approved policy */}
            <HelpTip label={t('helpFor', { label: title })}>
              {helpKey && <p className="!text-ex-ink !mb-2">{t(helpKey)}</p>}
              <p className="text-ex-muted !mb-0">{t('documents.evidence')}</p>
            </HelpTip>
          </div>

          {isRequired(selectedCriterion) && (
            <p className="text-ex-muted !mb-3 text-[13px]">
              {t('documents.requiredGroup')}
            </p>
          )}
          {!isRequired(selectedCriterion) && !isDeclared(selectedCriterion) && (
            <p className="text-ex-muted !mb-3 text-[13px]">
              {t('documents.optionalGroup')}
            </p>
          )}
          <FileUploader
            id={selectedCriterion}
            error={formErrors[selectedCriterion]}
            files={files[selectedCriterion] ?? []}
            quota={uploadQuota}
            onFilesSelected={(f) => onFilesSelected(selectedCriterion, f)}
            onRemoveFile={(i) => onRemoveFile(selectedCriterion, i)}
            onAddLink={(url) => onAddLink(selectedCriterion, url)}
          />
        </section>
      </div>
      <section
        className="expert-evidence-commitment"
        aria-labelledby="evidence-commitment-heading"
        data-accepted={conductAgreed || undefined}
      >
        <div className="expert-evidence-commitment-heading">
          <ShieldCheck size={22} aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <h3 id="evidence-commitment-heading">
              {t('commitment.sectionTitle')}
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> ({t('documents.required')})</span>
            </h3>
            <HelpTip
              label={t('helpFor', { label: t('commitment.sectionTitle') })}
            >
              <p className="!text-ex-ink !mt-0 !mb-2 !text-[13px]">
                {t('commitment.sectionHint')}
              </p>
              <p className="!text-ex-muted !m-0 !text-[13px]">
                {t('commitment.checkboxHint')}
              </p>
            </HelpTip>
          </div>
          {conductAgreed && (
            <span className="expert-commitment-done">
              <CircleCheck size={16} aria-hidden="true" />
              {t('commitment.accepted')}
            </span>
          )}
          {/* No checkbox: the commitment is accepted only from the dialog, after reading it */}
          <button
            type="button"
            className="expert-commitment-read"
            data-primary={!conductAgreed || undefined}
            disabled={!conduct}
            aria-invalid={!!formErrors.conduct}
            aria-describedby={formErrors.conduct ? 'error-conduct' : undefined}
            onClick={openCommitment}
          >
            {conductAgreed ? (
              <span>
                {t('commitment.reviewAgain')}
                <span className="sr-only"> {t('commitment.read')}</span>
              </span>
            ) : (
              <>
                {t('commitment.open')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
        {formErrors.conduct && (
          <p
            id="error-conduct"
            role="alert"
            className="expert-review-confirmation-error expert-commitment-error"
          >
            {formErrors.conduct}
          </p>
        )}
      </section>
      {showCommitment && conduct && (
        <div className="expert-commitment-modal">
          <Modal
            size="lg"
            bodyClassName="expert-commitment-body hide-scrollbar"
            title={t('commitment.title')}
            titleAddon={
              <HelpTip label={t('helpFor', { label: t('commitment.title') })}>
                {t('commitment.description')}
              </HelpTip>
            }
            onClose={() => setShowCommitment(false)}
            footer={
              conductAgreed ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      onAgreedChange(conduct.code, false)
                      setShowCommitment(false)
                    }}
                  >
                    {t('commitment.withdraw')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowCommitment(false)}
                  >
                    {t('commitment.close')}
                  </button>
                </>
              ) : (
                <>
                  {!readToEnd && (
                    <p
                      id="commitment-read-hint"
                      className="expert-commitment-read-hint"
                    >
                      {t('commitment.scrollToAccept')}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowCommitment(false)}
                  >
                    {t('commitment.later')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!readToEnd}
                    aria-describedby={
                      readToEnd ? undefined : 'commitment-read-hint'
                    }
                    onClick={() => {
                      onAgreedChange(conduct.code, true)
                      setShowCommitment(false)
                    }}
                  >
                    {t('commitment.accept')}
                  </button>
                </>
              )
            }
          >
            <div className="expert-commitment-details">
              <section>
                <div className="expert-commitment-section-heading">
                  <h3>
                    <ShieldCheck size={20} aria-hidden="true" />
                    {t('criteria.ethics')}
                  </h3>
                  <HelpTip
                    label={t('helpFor', { label: t('criteria.ethics') })}
                  >
                    {t('commitment.ethicsIntro')}
                  </HelpTip>
                </div>
                <ul className="list-disc space-y-2 pl-5">
                  {([1, 2, 3, 4, 5] as const).map((i) => (
                    <li key={i}>
                      <Trans
                        t={t}
                        i18nKey={`commitment.ethics${i}`}
                        components={{ b: <strong /> }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <div className="expert-commitment-section-heading">
                  <h3>
                    <LockKeyhole size={20} aria-hidden="true" />
                    {t('criteria.confidentiality')}
                  </h3>
                  <HelpTip
                    label={t('helpFor', { label: t('criteria.confidentiality') })}
                  >
                    {t('commitment.privacyIntro')}
                  </HelpTip>
                </div>
                <ul className="list-disc space-y-2 pl-5">
                  {([1, 2, 3, 4, 5] as const).map((i) => (
                    <li key={i}>
                      <Trans
                        t={t}
                        i18nKey={`commitment.privacy${i}`}
                        components={{ b: <strong /> }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
              {/* Reaching this point means the whole text has been on screen */}
              <div
                ref={watchReadEnd}
                className="col-span-full"
                aria-hidden="true"
              />
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
