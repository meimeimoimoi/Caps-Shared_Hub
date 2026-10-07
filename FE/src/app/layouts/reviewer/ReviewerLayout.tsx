import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, FileCheck2, History, Inbox } from 'lucide-react'
import { AppHeader } from '@/components/ui/layout/app-header'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Button } from '@/components/ui/actions/button'
import { useDialogMotion } from '@/components/ui/motion'
import { ReviewerProvider, useReviewer } from '@/features/reviewer'

function ReviewerShell() {
  const { t } = useTranslation(['reviewer', 'common'])
  const { state, actor, readOnly, setReadOnly, query, setQuery, reset } =
    useReviewer()
  const location = useLocation()
  const [params] = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const gate = location.pathname.includes('/gate-1/')
    ? 'GATE_1'
    : location.pathname.includes('/gate-2/')
      ? 'GATE_2'
      : params.get('gate')
  const isHistory = location.pathname.endsWith('/history')
  const title = isHistory
    ? t('history')
    : gate === 'GATE_1'
      ? t('gate1')
      : gate === 'GATE_2'
        ? t('gate2')
        : t('queue')
  useEffect(() => {
    document.title = `${title} | Shared Hub`
  }, [title])
  const isQueue =
    location.pathname === '/reviewer' || location.pathname === '/reviewer/'
  const openCount = (stage?: string) =>
    state.records.filter(
      (row) =>
        row.assignedTo === actor.id &&
        ['PENDING_REVIEW', 'NEED_MORE_INFORMATION'].includes(row.status) &&
        (!stage || row.gate === stage)
    ).length
  const groups: SidebarGroup[] = [
    {
      id: 'reviewer',
      label: t('workspace'),
      items: [
        {
          id: 'queue',
          to: '/reviewer',
          label: t('queue'),
          icon: <Inbox size={18} />,
          active: isQueue && !gate,
          badge: openCount(),
        },
        {
          id: 'gate1',
          to: '/reviewer?gate=GATE_1',
          label: t('gate1'),
          icon: <FileCheck2 size={18} />,
          active: !isHistory && gate === 'GATE_1',
          badge: openCount('GATE_1'),
        },
        {
          id: 'gate2',
          to: '/reviewer?gate=GATE_2',
          label: t('gate2'),
          icon: <ClipboardCheck size={18} />,
          active: !isHistory && gate === 'GATE_2',
          badge: openCount('GATE_2'),
        },
        {
          id: 'history',
          to: '/reviewer/history',
          label: t('history'),
          icon: <History size={18} />,
          active: isHistory,
        },
      ],
    },
  ]
  const sidebarProps = { groups, navigationLabel: t('workspace') }
  const close = () => drawer.current?.close()
  return (
    <div className="bg-canvas text-text min-h-svh">
      <a
        href="#reviewer-main"
        className="bg-surface sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        {t('common:navigation.skipWorkspace')}
      </a>
      <aside
        className={`bg-sidebar border-border fixed inset-y-0 left-0 z-30 hidden flex-col border-r py-6 md:flex ${collapsed ? 'w-20 px-3' : 'w-60 px-4'}`}
      >
        <AppSidebar
          {...sidebarProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label={t('workspace')}
        onClose={() => trigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar {...sidebarProps} onClose={close} onNavigate={close} />
      </dialog>
      <div className={collapsed ? 'md:ml-20' : 'md:ml-60'}>
        <AppHeader
          navigationButtonRef={trigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={
            isHistory
              ? t('history')
              : gate === 'GATE_1'
                ? t('gate1')
                : gate === 'GATE_2'
                  ? t('gate2')
                  : t('queue')
          }
          account={{ name: actor.name }}
          search={
            isQueue || isHistory
              ? { value: query, onChange: setQuery, label: t('search') }
              : undefined
          }
          searchLinks={groups[0].items.flatMap((item) =>
            item.to ? [{ to: item.to, label: item.label }] : []
          )}
        />
        <DemoBanner
          controls={
            <>
              <CustomSelect
                label={t('accessMode')}
                value={readOnly ? 'read' : 'assigned'}
                options={[
                  { value: 'assigned', label: t('assignedMode') },
                  { value: 'read', label: t('readOnlyMode') },
                ]}
                onChange={(value) => setReadOnly(value === 'read')}
                className="[&>span]:sr-only"
                triggerClassName="!w-52"
              />
              {(isQueue || isHistory) && (
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => {
                    if (window.confirm(t('resetConfirm'))) reset()
                  }}
                >
                  {t('reset')}
                </Button>
              )}
            </>
          }
        >
          {t('demo')}
        </DemoBanner>
        <main
          id="reviewer-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
export default function ReviewerLayout() {
  const { t } = useTranslation(['reviewer', 'common'])
  const mode = import.meta.env.VITE_REVIEWER_DATA_SOURCE ?? 'demo'
  if (!import.meta.env.DEV || mode !== 'demo')
    return (
      <main className="bg-canvas text-text min-h-svh p-8">
        <h1 className="text-text-strong text-2xl font-semibold">
          {t('unavailable')}
        </h1>
        <p className="mt-3 max-w-xl">{t('unavailableBody')}</p>
        <Link
          to="/dashboard"
          className="text-accent-text mt-6 inline-flex min-h-11 items-center"
        >
          {t('common:actions.dashboard')}
        </Link>
      </main>
    )
  return (
    <ReviewerProvider>
      <ReviewerShell />
    </ReviewerProvider>
  )
}
