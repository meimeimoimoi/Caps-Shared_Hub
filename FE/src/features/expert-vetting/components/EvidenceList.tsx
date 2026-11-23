import { Eye, FileText, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ApplicationDocument } from '../types'
import { documentKey } from '../utils/applications'
import { useEligibilityLabel } from '../hooks/useLabels'

interface EvidenceListProps {
  documents: ApplicationDocument[]
  /** Action button on each row, e.g. show the file in the document viewer */
  onOpen?: (document: ApplicationDocument) => void
  /** Show which requirement each file supports (off when the list is already for one requirement) */
  showGroup?: boolean
  /** Makes the whole row selectable and highlights the selected one */
  selectedKey?: string
  onSelect?: (key: string) => void
  emptyText: string
}

const isLink = (d: ApplicationDocument) => !!d.sourceUrl && /^https?:\/\//i.test(d.sourceUrl)

/** Uploaded files and public links of an application, named by the requirement they support. */
export function EvidenceList({ documents, onOpen, showGroup = true, selectedKey, onSelect, emptyText }: EvidenceListProps) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  // Internal codes (EV-01, C1…) are never shown: only a readable group name
  const group = (d: ApplicationDocument) =>
    d.code === 'CV'
      ? t('detail.documents.cv')
      : d.code === 'SUPPLEMENT'
        ? t('detail.documents.supplement')
        : label(d.code) !== d.code
          ? label(d.code)
          : ''
  if (documents.length === 0) {
    return <p className="border-border text-text-muted rounded-md border border-dashed px-3 py-3 text-sm">{emptyText}</p>
  }
  return (
    <ul className="border-border divide-border divide-y overflow-hidden rounded-md border">
      {documents.map((d) => {
        const key = documentKey(d)
        const Icon = isLink(d) ? Link2 : FileText
        const selected = selectedKey === key
        return (
          <li key={key} className={cn('relative flex items-center gap-3 px-3 py-2.5', onSelect && 'hover:bg-surface-muted/60', selected && '!bg-surface-muted')}>
            {selected && <span aria-hidden="true" className="bg-text-strong absolute inset-y-0 left-0 w-0.5" />}
            <span aria-hidden="true" className="bg-surface-muted text-text-muted flex size-8 shrink-0 items-center justify-center rounded-md">
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              {onSelect ? (
                <button type="button" aria-pressed={selected} onClick={() => onSelect(key)} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] block max-w-full truncate rounded-sm text-left text-sm font-medium after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:outline-none">
                  {d.name}
                </button>
              ) : (
                <p className="text-text-strong truncate text-sm font-medium" title={d.name}>{d.name}</p>
              )}
              {showGroup && group(d) && <p className="text-text-muted truncate text-xs">{group(d)}</p>}
            </div>
            {onOpen && (d.evidenceId || isLink(d)) && (
              <button type="button" onClick={() => onOpen(d)} className="border-border text-text-strong hover:bg-surface-muted focus-visible:ring-[var(--ui-border-strong)] inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
                <Eye size={14} aria-hidden="true" />
                {t('detail.documents.view')}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
