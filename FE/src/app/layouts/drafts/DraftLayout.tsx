import { useDialogMotion } from '@/components/ui/motion'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDraftHref } from '@/features/drafting/hooks/useDrafting'
import { AppHeader } from '@/components/ui/layout/app-header'
import { AppSidebar } from '@/components/ui/layout/app-sidebar'
import { useUserNavigation } from '@/app/layouts/user/useUserNavigation'

export function DraftLayout() {
  const { t } = useTranslation(['common', 'navigation'])
  const [expanded, setExpanded] = useState(true)
  const drawer = useRef<HTMLDialogElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((state) => state.user)
  // logout gọi API thu hồi refresh cookie rồi mới xoá phiên cục bộ
  const { logout } = useAuth()
  const location = useLocation()
  const href = useDraftHref()
  const groups = useUserNavigation(
    location.pathname.startsWith('/drafts/templates')
      ? 'templates'
      : 'workspaces',
    { draftHref: href }
  )
  const pageKey =
    location.pathname === '/drafts'
      ? 'workspaces'
      : location.pathname === '/drafts/templates'
        ? 'templates'
        : location.pathname.startsWith('/drafts/templates/')
          ? 'pages.templateDetail'
          : location.pathname.endsWith('/input')
            ? 'pages.draftInput'
            : location.pathname.includes('/generations/')
              ? 'pages.draftGeneration'
              : location.pathname.includes('/versions/')
                ? 'pages.draftVersion'
                : location.pathname.endsWith('/history')
                  ? 'pages.draftHistory'
                  : 'draftWorkspace'
  const closeDrawer = () => drawer.current?.close()
  return (
    <div className="bg-desk-2 text-fg min-h-svh">
      <a
        href="#draft-main"
        className="focus:bg-paper sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        {t('navigation.skipWorkspace')}
      </a>
      <aside
        className={`sidebar-rail bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${expanded ? 'w-60 px-4' : 'w-20 px-3'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('navigation:draftWorkspace')}
          collapsed={!expanded}
          onToggleCollapse={() => setExpanded((value) => !value)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label={t('navigation:draftNavigation')}
        onClose={() => drawerTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('navigation:draftWorkspace')}
          onNavigate={closeDrawer}
          onClose={closeDrawer}
        />
      </dialog>
      <div className={`sidebar-offset ${expanded ? 'md:ml-60' : 'md:ml-20'}`}>
        <AppHeader
          navigationButtonRef={drawerTrigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={
            <span
              aria-current="page"
              className="text-text-strong font-semibold"
            >
              {t(`navigation:${pageKey}`)}
            </span>
          }
          searchLinks={groups.flatMap((group) =>
            group.items.flatMap((item) =>
              item.to ? [{ label: item.label, to: item.to }] : []
            )
          )}
          account={{
            name: user?.name ?? t('account.preview'),
            avatarUrl: user?.avatarUrl,
            onSignOut: user ? () => void logout() : undefined,
            links: user
              ? []
              : [
                  {
                    label: t('actions.signIn'),
                    to: '/login',
                    icon: <LogIn size={17} />,
                  },
                ],
          }}
        />
        <main
          id="draft-main"
          className="mx-auto w-full max-w-[1440px] p-5 md:p-8 lg:p-10"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
