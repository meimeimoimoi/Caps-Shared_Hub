import { criteria } from '../../constants'
import { FileUploader } from '../FileUploader'

export interface SupportingDocumentsProps {
  activeCriterion: string
  files: Record<string, File[]>
  onCriterionSelect: (criterion: string) => void
  onFilesSelected: (criterion: string, files: FileList | null) => void
  onRemoveFile: (criterion: string, index: number) => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'

export function SupportingDocuments({
  activeCriterion,
  files,
  onCriterionSelect,
  onFilesSelected,
  onRemoveFile,
}: SupportingDocumentsProps) {
  return (
    <>
      <p>
        Organize evidence by eligibility criterion. The final required
        documents will be determined by the approved policy.
      </p>
      <div className={noteCls}>
        Preview requirements only: no fixed five-document checklist.
        Experience evidence is collected in the previous step.
      </div>
      <div className="grid grid-cols-[220px_1fr] gap-7 mt-7 max-md:grid-cols-1">
        <div
          className="flex flex-col gap-1.5 max-md:grid max-md:grid-cols-2"
          aria-label="Evidence categories"
        >
          {criteria.map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={activeCriterion === c}
              className={`${btnBase} flex-col !items-start text-left !text-[13px] transition-[background,border-color] duration-150 ease-in-out motion-reduce:transition-none ${activeCriterion === c ? '!bg-ex-chip-bg !border-ex-accent' : ''}`}
              onClick={() => onCriterionSelect(c)}
            >
              {c}
              <small className="font-normal text-ex-muted">
                {files[c]?.length ?? 0} files selected
              </small>
            </button>
          ))}
        </div>
        <section>
          <h3 className="!mt-0">{activeCriterion}</h3>
          <p>
            Provide relevant supporting evidence. Accepted document types and
            applicability must be confirmed by the eligibility policy.
          </p>
          <FileUploader
            id={activeCriterion}
            files={files[activeCriterion] ?? []}
            onFilesSelected={(f) => onFilesSelected(activeCriterion, f)}
            onRemoveFile={(i) => onRemoveFile(activeCriterion, i)}
          />
        </section>
      </div>
    </>
  )
}
