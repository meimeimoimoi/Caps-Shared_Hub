import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClipboardCheck,
  FileCheck2,
  History,
  Inbox,
  UserRound,
} from 'lucide-react'
import { AppHeader } from '@/components/ui/layout/app-header'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { useDialogMotion } from '@/components/ui/motion'
import { useReviewerCounts } from '@/features/reviewer/useReviewerQueue'
import { useAccount } from '@/features/auth'

function ReviewerShell() {
  const { t } = useTranslation(['reviewer', 'common'])
  const openCounts = useReviewerCounts()
  const [query, setQuery] = useState('')
  const location = useLocation()
  const account = useAccount('reviewer')
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const gate = /^\/reviewer\/gate-1(?:\/|$)/.test(location.pathname)
    ? 'GATE_1'
    : /^\/reviewer\/gate-2(?:\/|$)/.test(location.pathname)
      ? 'GATE_2'
      : null
  const isHistory = location.pathname.endsWith('/history')
  const isAccount = location.pathname.endsWith('/account')
  const title = isAccount
    ? t('account')
    : isHistory
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
  const openCount = (stage?: 'GATE_1' | 'GATE_2') => stage
    ? openCounts[stage]
    : openCounts.GATE_1 != null && openCounts.GATE_2 != null
      ? openCounts.GATE_1 + openCounts.GATE_2 : undefined
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
          to: '/reviewer/gate-1',
          label: t('gate1'),
          icon: <FileCheck2 size={18} />,
          active: !isHistory && gate === 'GATE_1',
          badge: openCount('GATE_1'),
        },
        {
          id: 'gate2',
          to: '/reviewer/gate-2',
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
    {
      id: 'system',
      label: t('system'),
      items: [
        {
          id: 'account',
          to: '/reviewer/account',
          label: t('account'),
          icon: <UserRound size={18} />,
          active: isAccount,
        },
      ],
    },
  ]
  const sidebarProps = { groups, navigationLabel: t('workspace'), badgeVariant: 'muted' as const }
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
        className={`sidebar-rail bg-sidebar border-border fixed inset-y-0 left-0 z-30 hidden flex-col border-r py-6 md:flex ${collapsed ? 'w-20 px-3' : 'w-60 px-4'}`}
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
      <div className={`sidebar-offset ${collapsed ? 'md:ml-20' : 'md:ml-60'}`}>
        <AppHeader
          navigationButtonRef={trigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={title}
          account={{
            name: account.name,
            avatarUrl: account.avatarUrl,
            onSignOut: account.logout,
            links: [
              {
                label: t('account'),
                to: '/reviewer/account',
                icon: <UserRound size={17} />,
                active: isAccount,
              },
            ],
          }}
          search={
            isQueue || isHistory
              ? { value: query, onChange: setQuery, label: t('search') }
              : undefined
          }
          searchLinks={groups
            .flatMap((group) => group.items)
            .flatMap((item) =>
              item.to ? [{ to: item.to, label: item.label }] : []
            )}
        />
        <main
          id="reviewer-main"
          tabIndex={-1}
          // Skip-link target only: clicking empty space focuses it, which must not draw a focus ring
          className="mx-auto w-full max-w-[1440px] px-4 py-8 outline-none sm:px-6 lg:px-8"
        >
          <Outlet context={{ query, setQuery }} />
        </main>
      </div>
    </div>
  )
}
export default function ReviewerLayout() {
  return <ReviewerShell />
}
