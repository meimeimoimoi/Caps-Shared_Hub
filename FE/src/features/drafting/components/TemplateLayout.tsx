import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { DocxPreview } from '@/features/knowledgeAdmin-templates/components/DocxPreview'
import { useDraftPresentation } from '../hooks/useDraftPresentation'
import { useTemplateFile } from '../hooks/useDrafting'
import { docxValues } from '../utils/docxValues'
import type { InputValues, TemplateVersion } from '../types'
import { DraftButton, DraftLoading, Paper } from './DraftUi'

/** The template's own Word layout with the values written into its blanks; only for versions that have a file */
export function TemplateLayout({
  template,
  input,
  scroll = true,
}: {
  template: TemplateVersion
  input: InputValues
  /** Keep the page inside a scroll box, for a side panel next to a long form */
  scroll?: boolean
}) {
  const { t } = useTranslation('drafting')
  const display = useDraftPresentation()
  const file = useTemplateFile(template)
  return (
    <Paper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2 flex items-center gap-2">
          {t('templateLayout')}
          <HelpTip label={t('templateLayout')}>{t('templateLayoutHelp')}</HelpTip>
        </h2>
        <DraftButton
          secondary
          disabled={!file.data}
          onClick={() => window.print()}
        >
          {t('printTemplateLayout')}
        </DraftButton>
      </div>
      {file.isError ? (
        <p role="alert" className="text-fg-muted mt-4 text-sm">
          {t('templateLayoutUnavailable')}
        </p>
      ) : file.data ? (
        // .print-sheet: printing the page prints this layout alone (globals.css)
        <div
          className={`print-sheet mt-4 ${scroll ? 'max-h-[75vh] overflow-auto' : ''}`}
        >
          <DocxPreview
            file={file.data}
            fills={docxValues(template.fields, input, (n) => display.number(n))}
          />
        </div>
      ) : (
        <DraftLoading message={t('templateLayout')} />
      )}
    </Paper>
  )
}
