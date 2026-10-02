import { Upload, FileText, X } from 'lucide-react'

export interface FileUploaderProps {
  id: string
  files: File[]
  onFilesSelected: (files: FileList | null) => void
  onRemoveFile: (index: number) => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'

export function FileUploader({
  id,
  files,
  onFilesSelected,
  onRemoveFile,
}: FileUploaderProps) {
  return (
    <div className="mb-6">
      <label className="flex items-center flex-col gap-2 border border-dashed border-ex-chip-border rounded-md py-6 px-4 bg-ex-drop-bg cursor-pointer text-center transition-[border-color,background,box-shadow] duration-150 ease-in-out hover:border-ex-accent hover:bg-ex-drop-hover focus-within:ring-2 focus-within:ring-ex-accent focus-within:ring-offset-2 motion-reduce:transition-none">
        <Upload size={22} />
        <strong>Choose supporting files</strong>
        <span className="text-xs text-ex-muted">PDF, JPG or PNG · up to 10 MB each (demo)</span>
        <input
          aria-label={`Choose files for ${id}`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="sr-only"
          onChange={(e) => {
            onFilesSelected(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {files.map((f, i) => (
        <div className="flex gap-2.5 items-center py-3 border-b border-ex-file-border text-sm" key={`${f.name}-${i}`}>
          <FileText size={18} />
          <span className="flex-1 break-all min-w-0">
            {f.name}
            <small className="block text-ex-muted">{(f.size / 1024).toFixed(0)} KB · Selected locally</small>
          </span>
          <button
            type="button"
            className={`${btnBase} !border-0 !p-2`}
            aria-label={`Remove ${f.name}`}
            onClick={() => onRemoveFile(i)}
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}
