import { useTranslation } from 'react-i18next'
import { Info, FolderOpen } from 'lucide-react'
import { criteria, criterionKey } from '../../constants'
import { FileUploader } from '../FileUploader'

export interface SupportingDocumentsProps {
  activeCriterion: string
  formErrors: Record<string, string>
  files: Record<string, File[]>
  onCriterionSelect: (criterion: string) => void
  onFilesSelected: (criterion: string, files: FileList | null) => void
  onRemoveFile: (criterion: string, index: number) => void
}

export function SupportingDocuments({
  activeCriterion,
  formErrors,
  files,
  onCriterionSelect,
  onFilesSelected,
  onRemoveFile,
}: SupportingDocumentsProps) {
  const { t } = useTranslation('expertRegistration')

  return (
    <div className="expert-pro-documents">
      <p className="expert-pro-subtitle">{t('documents.guidance')}</p>

      {/* ── Warning Notice ── */}
      <div className="expert-pro-notice expert-pro-notice--warn">
        <Info className="expert-pro-notice-icon" aria-hidden="true" />
        <p>{t('documents.preview')}</p>
      </div>

      {/* ── Tabs and Upload Area ── */}
      <div className="expert-pro-tabs-container">
        {/* Sidebar Tabs */}
        <div
          className="expert-pro-tab-list"
          role="tablist"
          aria-label={t('documents.categories')}
        >
          {criteria.map((c) => (
            <button
              type="button"
              key={c}
              role="tab"
              id={`evidence-tab-${criteria.indexOf(c)}`}
              aria-controls="evidence-panel"
              aria-selected={activeCriterion === c}
              aria-pressed={activeCriterion === c}
              className="expert-pro-tab"
              onClick={() => onCriterionSelect(c)}
            >
              <strong>{t(criterionKey(c)!)}</strong>
              <small>{t('counts.selected', { count: files[c]?.length ?? 0 })}</small>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <section
          key={activeCriterion}
          id="evidence-panel"
          className="expert-pro-section"
          role="tabpanel"
          aria-labelledby={`evidence-tab-${criteria.indexOf(activeCriterion)}`}
        >
          <div className="expert-pro-section-header">
            <span
              className="expert-pro-section-icon"
              style={{ background: '#f5efe9', color: '#a34524' }}
            >
              <FolderOpen size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">{criterionKey(activeCriterion) ? t(criterionKey(activeCriterion)!) : activeCriterion}</h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <p className="text-ex-muted mb-5 text-[14px] leading-[1.6]">
            {t('documents.evidence')}
          </p>

          <FileUploader
            id={activeCriterion}
            error={formErrors[activeCriterion]}
            files={files[activeCriterion] ?? []}
            onFilesSelected={(f) => onFilesSelected(activeCriterion, f)}
            onRemoveFile={(i) => onRemoveFile(activeCriterion, i)}
          />
        </section>
      </div>
    </div>
  )
}
