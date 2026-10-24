import { Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import type { FinalApprovalReturn } from '../types'
import { formatDateTime } from '../utils/applications'

/* Shown above the Gate 2 form when a System Admin sent the result back, with their reason */
export function FinalApprovalReturnNotice({ value }: { value: FinalApprovalReturn }) {
  const { t } = useTranslation('admin')
  return (
    <section role="status" className="bg-warning-soft rounded-surface p-4 text-sm">
      <div className="text-warning flex items-center gap-2 font-semibold">
        <Undo2 size={16} aria-hidden="true" />
        <h2 className="!font-sans !text-base">{t('finalReturn.title')}</h2>
        <HelpTip label={t('finalReturn.title')}>{t('finalReturn.help')}</HelpTip>
      </div>
      {value.note && <p className="text-fg-strong mt-2 whitespace-pre-line">{value.note}</p>}
      <p className="text-fg-muted mt-2">
        {t('finalReturn.by', {
          actor: value.actorEmail ?? t('finalReturn.admin'),
          time: formatDateTime(value.at),
        })}
      </p>
    </section>
  )
}
