import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Modal } from '@/components/ui/feedback/modal'
import { DocxPreview } from '@/features/knowledgeAdmin-templates/components/DocxPreview'
import { useTemplateFile } from '../hooks/useDrafting'
import type { TemplateVersion } from '../types'
import { DraftLoading } from './DraftUi'

/** Read-only look at a template's Word file before drafting; each blank shows the field that fills it */
export function TemplateFileModal({
  template,
  onClose,
  action,
}: {
  template: TemplateVersion
  onClose: () => void
  action?: ReactNode
}) {
  const { t } = useTranslation('drafting')
  const file = useTemplateFile(template)
  // The form already prints codes like [01] beside the blank, so the name goes in without it
  const fills = template.fields.flatMap((f) =>
    f.anchor
      ? [
          {
            id: f.id,
            anchor: f.anchor,
            label: f.label,
            text: f.label.replace(/^\[\w+\]\s*/, ''),
          },
        ]
      : []
  )
  return (
    <Modal
      title={template.title}
      titleAddon={
        <HelpTip label={t('viewTemplateFile')}>
          {t('templateFilePreviewHelp')}
        </HelpTip>
      }
      size="xl"
      onClose={onClose}
      footer={action}
    >
      {file.isError ? (
        <p role="alert" className="text-fg-muted text-sm">
          {t('templateLayoutUnavailable')}
        </p>
      ) : file.data ? (
        <DocxPreview file={file.data} fills={fills} />
      ) : (
        <DraftLoading message={t('viewTemplateFile')} />
      )}
    </Modal>
  )
}
