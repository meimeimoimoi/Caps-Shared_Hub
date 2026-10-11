import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderSearch, Store } from 'lucide-react'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { CASE_STATUS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { DEMO_CASES, demoCase } from '@/features/review-case/fixtures'
import {
  ACTION_STATUSES,
  CLOSED_STATUSES,
  useCaseFormat,
} from '@/features/review-case/ui'
import type { ReviewCase } from '@/features/review-case/types'

const FILTERS = ['all', 'action', 'active', 'closed'] as const
type Filter = (typeof FILTERS)[number]

const match = (f: Filter, c: ReviewCase) =>
  f === 'all' ||
  (f === 'action' && ACTION_STATUSES.includes(c.status)) ||
  (f === 'closed' && CLOSED_STATUSES.includes(c.status)) ||
  (f === 'active' &&
    !ACTION_STATUSES.includes(c.status) &&
    !CLOSED_STATUSES.includes(c.status))

/* Lịch sử yêu cầu thẩm định; bộ lọc nằm trên URL để Back/chia sẻ link giữ đúng tab */
export default function CasesPage() {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const [params, setParams] = useSearchParams()
  const raw = params.get('filter')
  const filter: Filter = FILTERS.includes(raw as Filter)
    ? (raw as Filter)
    : 'all'
  // ponytail: toàn bộ danh sách demo, lọc phía client; cần phân trang server khi có API
  const cases = useMemo(
    () =>
      DEMO_CASES.map((d) => demoCase(d.id)!).sort((a, b) =>
        b.timeline[0].at.localeCompare(a.timeline[0].at)
      ),
    []
  )
  const shown = cases.filter((c) => match(filter, c))

  useEffect(() => {
    document.title = `${t('nav.cases')} | Shared Hub`
  }, [t])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-serif">{t('nav.cases')}</h1>
          <p className="text-fg-muted mt-2 max-w-[65ch]">{t('cases.lead')}</p>
        </div>
        <Link to="/marketplace" className="btn btn-press btn-primary">
          <Store size={17} aria-hidden="true" />
          {t('cases.new')}
        </Link>
      </div>

      <nav
        aria-label={t('cases.filterLabel')}
        className="sm:border-border mt-8 grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:border-b"
      >
        {FILTERS.map((k) => {
          const count = cases.filter((c) => match(k, c)).length
          return (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() =>
                setParams(k === 'all' ? {} : { filter: k }, { replace: true })
              }
              className={cn(
                // Điện thoại: lưới 2×2 dạng nút; từ sm: tab gạch chân
                'rounded-control flex items-center justify-between gap-2 border px-3 py-2.5 text-sm font-semibold transition-colors sm:-mb-px sm:justify-start sm:rounded-none sm:border-0 sm:border-b-2',
                filter === k
                  ? 'border-ink bg-paper text-fg-strong sm:border-indicator sm:bg-transparent'
                  : 'text-fg-muted hover:text-fg-strong border-border sm:border-transparent'
              )}
            >
              {t(`cases.filters.${k}`)}
              <span className="num bg-sunken text-fg rounded-full px-2 text-xs">
                {count}
              </span>
            </button>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="paper mt-6 p-10 text-center">
          <FolderSearch
            size={28}
            aria-hidden="true"
            className="text-fg-muted mx-auto"
          />
          <p className="text-fg-strong mt-3 font-semibold">
            {cases.length ? t('cases.empty') : t('cases.emptyAll')}
          </p>
        </div>
      ) : (
        <div className="paper mt-6 overflow-x-auto">
          <table className="w-full text-sm md:min-w-[46rem]">
            <thead className="bg-sunken text-fg-muted text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:whitespace-nowrap">
                <th scope="col">{t('cases.cols.case')}</th>
                <th scope="col" className="max-md:hidden">
                  {t('cases.cols.expert')}
                </th>
                <th scope="col" className="max-md:hidden">
                  {t('cases.cols.status')}
                </th>
                <th scope="col" className="max-md:hidden">
                  {t('cases.cols.updated')}
                </th>
                <th scope="col" className="text-right">
                  {t('cases.cols.fee')}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr
                  key={c.id}
                  className="border-border-subtle hover:bg-sunken/60 border-t [&>td]:px-4 [&>td]:py-3.5"
                >
                  <td className="max-w-[24rem] max-md:max-w-[14rem]">
                    <Link to={`/cases/${c.id}`} className="group block">
                      <span className="num text-fg-strong group-hover:text-accent-text block font-semibold">
                        {c.id}
                      </span>
                      <span className="text-fg block truncate">{c.title}</span>
                    </Link>
                    <span className="mt-1.5 block md:hidden">
                      <StatusBadge
                        status={{
                          label: t(`status.${c.status}`),
                          tone: CASE_STATUS[c.status].tone,
                        }}
                      />
                    </span>
                  </td>
                  <td className="text-fg whitespace-nowrap max-md:hidden">
                    {c.expert.name}
                  </td>
                  <td className="max-md:hidden">
                    <StatusBadge
                      status={{
                        label: t(`status.${c.status}`),
                        tone: CASE_STATUS[c.status].tone,
                      }}
                    />
                  </td>
                  <td className="num text-fg-muted whitespace-nowrap max-md:hidden">
                    {f.at(c.timeline[0].at)}
                  </td>
                  <td className="num text-fg-strong text-right font-semibold whitespace-nowrap">
                    {f.money(c.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
