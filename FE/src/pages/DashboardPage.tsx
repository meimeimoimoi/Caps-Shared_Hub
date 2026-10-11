import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Bot, CircleCheck, FilePlus2, Store } from 'lucide-react'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { useAuthStore } from '@/features/auth'
import { useAccount } from '@/features/auth/hooks/useAccount'
import { useExpertContext } from '@/features/expert-context'
import { Countdown } from '@/features/review-case/components/CaseUi'
import { DEMO_CASES, demoCase } from '@/features/review-case/fixtures'
import { ACTION_STATUSES, useCaseFormat } from '@/features/review-case/ui'
import { WALLET } from '@/features/wallet/fixtures'
import { CASE_STATUS } from '@/lib/constants'

/* Tổng quan của client. Chuyên gia đăng nhập thật vẫn được chuyển sang cổng Expert như trước. */
export default function DashboardPage() {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const context = useExpertContext()
  const account = useAccount('client')
  const cases = useMemo(
    () =>
      DEMO_CASES.map((d) => demoCase(d.id)!).sort((a, b) =>
        b.timeline[0].at.localeCompare(a.timeline[0].at)
      ),
    []
  )
  const todo = cases.filter((c) => ACTION_STATUSES.includes(c.status))

  useEffect(() => {
    document.title = `${t('nav.dashboard')} | Shared Hub`
  }, [t])

  if (authenticated && context.data?.portalAccess.allowed)
    return <Navigate to="/expert/overview" replace />

  const quick = [
    { to: '/drafts', label: t('dashboard.newDraft'), icon: FilePlus2 },
    { to: '/marketplace', label: t('dashboard.findExpert'), icon: Store },
    { to: '/ai-assistant', label: t('dashboard.askAi'), icon: Bot },
  ]

  return (
    <>
      <h1 className="text-h1 font-serif">
        {t('dashboard.greeting', { name: account.name })}
      </h1>
      <p className="text-fg-muted mt-2">{t('dashboard.lead')}</p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <section className="paper p-6 md:p-8" aria-labelledby="d-todo">
            <h2 id="d-todo" className="text-h2">
              {t('dashboard.todo')}{' '}
              <span className="num text-fg-muted">({todo.length})</span>
            </h2>
            {todo.length === 0 ? (
              <p className="text-fg-muted mt-4 flex items-center gap-2">
                <CircleCheck
                  size={18}
                  aria-hidden="true"
                  className="text-success"
                />
                {t('dashboard.todoEmpty')}
              </p>
            ) : (
              <ul className="mt-4">
                {todo.map((c) => {
                  const due = c.due?.payment ?? c.due?.info ?? c.due?.acceptance
                  return (
                    <li
                      key={c.id}
                      className="border-border-subtle flex flex-wrap items-center gap-x-6 gap-y-3 border-t py-4 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1 basis-64">
                        <StatusBadge
                          status={{
                            label: t(`status.${c.status}`),
                            tone: CASE_STATUS[c.status].tone,
                          }}
                        />
                        <p className="text-fg-strong mt-1.5 truncate font-semibold">
                          {c.title}
                        </p>
                        <p className="text-fg-muted num text-sm">
                          {c.id}
                          {due && (
                            <>
                              {' · '}
                              <Countdown
                                dueAt={due}
                                urgentMs={3_600_000}
                              />{' '}
                              {t('countdown.left')}
                            </>
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/cases/${c.id}`}
                        className="btn btn-press btn-primary motion-directional shrink-0"
                      >
                        {t(`dashboard.cta.${c.status as 'AWAITING_PAYMENT'}`)}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="d-recent">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="d-recent" className="text-h2">
                {t('dashboard.recent')}
              </h2>
              <Link
                to="/cases"
                className="text-fg-strong text-sm font-semibold underline underline-offset-2"
              >
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <ul className="border-border mt-3 border-t">
              {cases.slice(0, 5).map((c) => (
                <li key={c.id} className="border-border-subtle border-b">
                  <Link
                    to={`/cases/${c.id}`}
                    className="group flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="w-full min-w-0 sm:w-auto">
                      <span className="text-fg-strong group-hover:text-accent-text block truncate font-semibold">
                        {c.title}
                      </span>
                      <span className="text-fg-muted num block text-sm">
                        {c.id} · {f.at(c.timeline[0].at)}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <StatusBadge
                        status={{
                          label: t(`status.${c.status}`),
                          tone: CASE_STATUS[c.status].tone,
                        }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="paper p-5" aria-labelledby="d-credits">
            <h2 id="d-credits" className="eyebrow font-sans">
              {t('dashboard.credits')}
            </h2>
            <p className="num text-fg-strong mt-2 text-[2.25rem] leading-none font-semibold">
              {WALLET.available}
            </p>
            <p className="text-fg-muted mt-1 text-sm">
              {t('wallet.held')}: {t('wallet.unit', { count: WALLET.held })}
            </p>
            <Link to="/wallet" className="btn btn-secondary mt-4 w-full">
              {t('dashboard.topUp')}
            </Link>
          </section>
          <section
            aria-labelledby="d-quick"
            className="border-border border-t pt-5"
          >
            <h2 id="d-quick" className="eyebrow font-sans">
              {t('dashboard.quick')}
            </h2>
            <ul className="mt-2">
              {quick.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-fg-strong hover:bg-desk rounded-control flex items-center gap-3 px-2 py-2.5 text-sm font-semibold"
                  >
                    <Icon
                      size={17}
                      aria-hidden="true"
                      className="text-fg-muted"
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}
