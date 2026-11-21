import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { getExcuseFile } from '../api/adminApi'
import type { ExcuseFile } from '../types'

/** Evidence files of an excuse request; each opens in a new tab through the admin API (files are private). */
export function ExcuseFiles({
  expertId,
  reviewCaseId,
  files,
}: {
  expertId: string
  reviewCaseId: string
  files: ExcuseFile[]
}) {
  const { t } = useTranslation('admin')
  const [failed, setFailed] = useState(false)
  if (files.length === 0)
    return <p className="text-fg-muted text-xs">{t('experts.violations.noFiles')}</p>

  const open = async (file: ExcuseFile) => {
    setFailed(false)
    // Open the tab first: a window opened after an await is blocked as a popup
    const tab = window.open('', '_blank')
    try {
      const blob = await getExcuseFile(expertId, reviewCaseId, file.id)
      const url = URL.createObjectURL(blob)
      if (tab) tab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      tab?.close()
      setFailed(true)
    }
  }

  return (
    <div className="mt-1">
      <ul className="flex flex-wrap gap-2">
        {files.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => void open(f)}
              className="text-accent-text inline-flex items-center gap-1 text-xs underline underline-offset-4 hover:no-underline"
            >
              <FileText size={14} aria-hidden="true" />
              {f.fileName}
              <span className="text-fg-muted num">({Math.ceil(f.sizeBytes / 1024)} KB)</span>
            </button>
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="text-danger mt-1 text-xs">
          {t('experts.violations.fileFailed')}
        </p>
      )}
    </div>
  )
}
