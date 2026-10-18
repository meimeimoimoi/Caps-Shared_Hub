import { useTranslation } from 'react-i18next'
import { Circle, CircleCheck } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useFormatters } from '@/hooks/useFormatters'
import { criteria, criterionKey } from '../../constants'
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
  activeCriterion: string
  formErrors: Record<string, string>
  files: Record<string, EvidenceFile[]>
  uploadQuota?: UploadQuota
  onCriterionSelect: (criterion: string) => void
  onFilesSelected: (criterion: string, files: FileList | null) => void
  onRemoveFile: (criterion: string, index: number) => void
}

export function SupportingDocuments({
  activeCriterion,
  formErrors,
  files,
  uploadQuota,
  onCriterionSelect,
  onFilesSelected,
  onRemoveFile,
}: SupportingDocumentsProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  const key = criterionKey(activeCriterion)
  const title = key ? t(key) : activeCriterion
  const helpKey = key ? CRITERION_HELP[key] : undefined

  return (
    <div className="expert-pro-documents">
      <p className="expert-pro-subtitle">{t('documents.lead')}</p>

      {/* ── Tabs and Upload Area ── */}
      <div className="expert-pro-tabs-container">
        {/* Group navigation: one panel, a status mark and file count per group */}
        <nav className="expert-doc-nav" aria-label={t('documents.categories')}>
          <p className="expert-doc-nav-summary">
            {t('documents.groupsDone', {
              done: format.number(
                criteria.filter((c) => (files[c]?.length ?? 0) > 0).length
              ),
              total: format.number(criteria.length),
            })}
          </p>
          <div
            className="expert-pro-tab-list"
            role="tablist"
            aria-label={t('documents.categories')}
          >
            {criteria.map((c) => {
              const count = files[c]?.length ?? 0
              return (
                <button
                  type="button"
                  key={c}
                  role="tab"
                  id={`evidence-tab-${criteria.indexOf(c)}`}
                  aria-controls="evidence-panel"
                  aria-selected={activeCriterion === c}
                  className="expert-pro-tab"
                  data-has-files={count > 0 || undefined}
                  onClick={() => onCriterionSelect(c)}
                >
                  <span className="expert-doc-nav-mark" aria-hidden="true">
                    {count > 0 ? (
                      <CircleCheck size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </span>
                  <span className="expert-doc-nav-label">
                    {t(criterionKey(c)!)}
                  </span>
                  <span className="expert-doc-nav-count">
                    {count > 0 ? format.number(count) : t('documents.none')}
                    <span className="sr-only">
                      {' '}
                      {t('counts.selected', { count })}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main Content Area */}
        <section
          key={activeCriterion}
          id="evidence-panel"
          className="expert-pro-section"
          role="tabpanel"
          aria-labelledby={`evidence-tab-${criteria.indexOf(activeCriterion)}`}
        >
          <div className="expert-pro-section-header">
            <h3 className="expert-pro-section-title">{title}</h3>
            {/* What this group needs (EV-01…EV-05); accepted document types follow the approved policy */}
            <HelpTip label={t('helpFor', { label: title })}>
              {helpKey && <p className="!text-ex-ink !mb-2">{t(helpKey)}</p>}
              <p className="text-ex-muted !mb-0">{t('documents.evidence')}</p>
            </HelpTip>
          </div>

          <FileUploader
            id={activeCriterion}
            error={formErrors[activeCriterion]}
            files={files[activeCriterion] ?? []}
            quota={uploadQuota}
            onFilesSelected={(f) => onFilesSelected(activeCriterion, f)}
            onRemoveFile={(i) => onRemoveFile(activeCriterion, i)}
          />
        </section>
      </div>
    </div>
  )
}
