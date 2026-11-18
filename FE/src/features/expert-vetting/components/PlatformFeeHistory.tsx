import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/feedback/modal'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { LoadError } from '@/components/ui/feedback/load-error'
import { adminKeys } from '../api/queryKeys'
import {
  getPlatformFeeHistory,
  type PlatformFeeChange,
} from '../api/platformFeeApi'
import { formatDate } from '../utils/applications'

const filters = ['all', 'applied', 'pending', 'cancelled'] as const
type HistoryFilter = (typeof filters)[number]

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
  // Read the clock once on mount so renders stay pure
  const [now] = useState(() => Date.now())
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const entries = history.data?.filter(
    (row) => filter === 'all' || status(row, now) === filter
  ) ?? []

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
        <>
          <CustomSelect
            className="mb-4 grid max-w-xs gap-2 text-sm font-semibold"
            label={t('admin:platformFees.history.filterLabel')}
            value={filter}
            onChange={setFilter}
            options={filters.map((value) => ({
              value,
              label: t(`admin:platformFees.history.filters.${value}`),
            }))}
          />
          {entries.length === 0 ? (
            <p className="text-fg-muted border-border-subtle border-t py-4 text-sm">
              {t('admin:platformFees.history.emptyFilter')}
            </p>
          ) : (
            <ol className="divide-border-subtle divide-y text-sm">
              {entries.map((row) => {
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
        </>
      )}
    </Modal>
  )
}
