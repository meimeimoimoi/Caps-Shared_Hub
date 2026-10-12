import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { AppHeader } from '@/components/ui/layout/app-header'
import { AppSidebar } from '@/components/ui/layout/app-sidebar'
import { useDialogMotion } from '@/components/ui/motion'
import { useAuthStore } from '@/features/auth'
import { useAccount } from '@/features/auth/hooks/useAccount'
import {
  useUserNavigation,
  type UserNavId,
} from '@/app/layouts/user/useUserNavigation'

const SECTIONS: [string, UserNavId][] = [
  ['/dashboard', 'dashboard'],
  ['/cases', 'cases'],
  ['/wallet', 'wallet'],
  ['/account', 'account'],
]

/* Không gian khách hàng: Tổng quan, Hồ sơ thẩm định, Ví, Tài khoản. Sidebar dùng chung useUserNavigation.
 * Dev mở demo không cần đăng nhập (như StaffRoute); production bắt buộc phiên đăng nhập. */
export function ClientLayout() {
  const { t } = useTranslation('reviewCase')
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const account = useAccount('client')
  const location = useLocation()
  const path = location.pathname
  const [expanded, setExpanded] = useState(true)
  const drawer = useRef<HTMLDialogElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const active = SECTIONS.find(([prefix]) => path.startsWith(prefix))?.[1]
  const groups = useUserNavigation(active)

  if (!import.meta.env.DEV && !authenticated)
    return (
      <Navigate to="/login" replace state={{ from: path + location.search }} />
    )

  const page = path.startsWith('/cases/new')
    ? t('request.title')
    : path.startsWith('/cases/')
      ? t('pageTitle')
      : (groups.flatMap((g) => g.items).find((i) => i.active)?.label ??
        t('nav.label'))
  const closeDrawer = () => drawer.current?.close()

  return (
    <div className="bg-desk-2 text-fg min-h-svh">
      <aside
        className={`sidebar-rail bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${expanded ? 'w-60 px-4' : 'w-20 px-3'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('nav.label')}
          collapsed={!expanded}
          onToggleCollapse={() => setExpanded((v) => !v)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label={t('nav.label')}
        onClose={() => drawerTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('nav.label')}
          onNavigate={closeDrawer}
          onClose={closeDrawer}
        />
      </dialog>
      <div className={`sidebar-offset ${expanded ? 'md:ml-60' : 'md:ml-20'}`}>
        <AppHeader
          navigationButtonRef={drawerTrigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={
            <span aria-current="page" className="text-fg-strong font-semibold">
              {page}
            </span>
          }
          searchLinks={groups.flatMap((g) =>
            g.items.flatMap((i) => (i.to ? [{ label: i.label, to: i.to }] : []))
          )}
          account={{
            name: account.name,
            avatarUrl: account.avatarUrl,
            onSignOut: account.logout,
          }}
        />
        {account.isDemo && (
          <DemoBanner>
            <p>{t('demo.disclosure')}</p>
          </DemoBanner>
        )}
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
