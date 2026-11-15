import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/feedback/modal'
import { LoadError } from '@/components/ui/feedback/load-error'
import { adminKeys } from '../api/queryKeys'
import {
  getPlatformFeeHistory,
  type PlatformFeeChange,
} from '../api/platformFeeApi'
import { formatDate } from '../utils/applications'

const status = (row: PlatformFeeChange, now: number) =>
  row.cancelledAt
    ? 'cancelled'
    : Date.parse(row.effectiveFrom) > now
      ? 'pending'
      : 'applied'

/** Every fee set for one service, newest first, with who set it and why; rows are never edited. */
export function PlatformFeeHistory({
  serviceCode,
  serviceName,
  onClose,
}: {
  serviceCode: string
  serviceName: string
  onClose: () => void
}) {
  const { t } = useTranslation(['admin', 'common'])
  const history = useQuery({
    queryKey: [...adminKeys.all, 'platform-fees', serviceCode, 'history'],
    queryFn: ({ signal }) => getPlatformFeeHistory(serviceCode, signal),
  })
  const now = Date.now()

  return (
    <Modal
      size="lg"
      title={t('admin:platformFees.history.title', { name: serviceName })}
      onClose={onClose}
      footer={
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="btn btn-press btn-secondary"
        >
          {t('common:actions.close')}
        </button>
      }
    >
      {history.error ? (
        <LoadError error={history.error} />
      ) : history.isLoading ? (
        <p className="text-fg-muted text-sm">{t('common:loading')}</p>
      ) : !history.data?.length ? (
        <p className="text-fg-muted text-sm">
          {t('admin:platformFees.history.empty')}
        </p>
      ) : (
        <ol className="divide-border-subtle divide-y text-sm">
          {history.data.map((row) => {
            const state = status(row, now)
            return (
              <li
                key={`${row.effectiveFrom}-${row.setBy}`}
                className="py-3 first:pt-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-fg-strong font-semibold">
                    <span className="num">{row.percent}%</span>
                    <span className="text-fg-muted ml-2 font-normal">
                      {t('admin:platformFees.history.terms', {
                        lateHours: row.latePenaltyHours,
                        latePercent: row.latePenaltyPercent,
                        refund: row.noResponseRefundPercent,
                        expert: row.noResponseExpertPercent,
                      })}
                    </span>
                  </p>
                  <span
                    className={
                      state === 'cancelled'
                        ? 'text-fg-muted text-caption line-through'
                        : 'text-caption text-fg'
                    }
                  >
                    {t(`admin:platformFees.history.${state}`, {
                      date: formatDate(row.effectiveFrom),
                    })}
                  </span>
                </div>
                <p className="text-fg mt-1 whitespace-pre-wrap wrap-break-word">
                  {row.reason ?? (
                    <span className="text-fg-muted italic">
                      {t('admin:platformFees.history.noReason')}
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}
