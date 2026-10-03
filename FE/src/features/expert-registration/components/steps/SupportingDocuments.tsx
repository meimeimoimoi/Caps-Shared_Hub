import { Info, FolderOpen } from 'lucide-react'
import { criteria } from '../../constants'
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
  return (
    <div className="expert-pro-documents">
      <p className="expert-pro-subtitle">
        Organize evidence by eligibility criterion. The final required
        documents will be determined by the approved policy.
      </p>

      {/* ── Warning Notice ── */}
      <div className="expert-pro-notice expert-pro-notice--warn">
        <Info className="expert-pro-notice-icon" aria-hidden="true" />
        <p>
          Preview requirements only: no fixed five-document checklist. Experience
          evidence is collected in the previous step.
        </p>
      </div>

      {/* ── Tabs and Upload Area ── */}
      <div className="expert-pro-tabs-container">
        {/* Sidebar Tabs */}
        <div
          className="expert-pro-tab-list"
          role="tablist"
          aria-label="Evidence categories"
        >
          {criteria.map((c) => (
            <button
              type="button"
              key={c}
              role="tab"
              aria-selected={activeCriterion === c}
              aria-pressed={activeCriterion === c}
              className="expert-pro-tab"
              onClick={() => onCriterionSelect(c)}
            >
              <strong>{c}</strong>
              <small>
                {files[c]?.length ?? 0} files selected
              </small>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <section
          className="expert-pro-section"
          role="tabpanel"
          aria-labelledby={activeCriterion}
        >
          <div className="expert-pro-section-header">
            <span className="expert-pro-section-icon" style={{ background: '#f5efe9', color: '#a34524' }}>
              <FolderOpen size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">{activeCriterion}</h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <p className="text-[14px] text-ex-muted mb-5 leading-[1.6]">
            Provide relevant supporting evidence. Accepted document types and
            applicability must be confirmed by the eligibility policy.
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
