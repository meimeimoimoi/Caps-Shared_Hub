import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { useTheme } from '@/hooks/useTheme'
import { useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FileText,
  Library,
  LayoutDashboard,
  LogIn,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { isDraftMock, isDraftPreview } from '@/features/drafting/api/dataSource'
import { draftScenarios } from '@/features/drafting/constants'
import {
  useDraftAction,
  useDraftContext,
  useDraftHref,
} from '@/features/drafting/hooks/useDrafting'
import { draftApi } from '@/features/drafting/api/draftApi'
import { DraftButton } from '@/features/drafting/components/DraftUi'
import { AppAccountMenu } from '@/components/ui/layout/app-account-menu'
import {
  AppHeader,
  HeaderActionButton,
} from '@/components/ui/layout/app-header'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'

export function DraftLayout() {
  const { isDark, toggleTheme } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const drawer = useRef<HTMLDialogElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const navigate = useNavigate()
  const location = useLocation()
  const href = useDraftHref()
  const ctx = useDraftContext()
  const reset = useDraftAction((_: void, context) => draftApi.reset(context))
  const groups: SidebarGroup[] = [
    {
      id: 'drafts',
      items: [
        {
          id: 'workspaces',
          to: href('/drafts'),
          label: 'Workspaces',
          icon: <FileText size={18} />,
          active: !location.pathname.startsWith('/drafts/templates'),
        },
        {
          id: 'templates',
          to: href('/drafts/templates'),
          label: 'Templates',
          icon: <Library size={18} />,
          active: location.pathname.startsWith('/drafts/templates'),
        },
        ...(!isDraftPreview
          ? [
              {
                id: 'dashboard',
                to: '/dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard size={18} />,
              },
            ]
          : []),
      ],
    },
  ]
  const closeDrawer = () => drawer.current?.close()
  return (
    <div className="bg-desk-2 text-fg selection:bg-accent-soft selection:text-accent-text min-h-svh">
      <a
        href="#draft-main"
        className="focus:bg-paper sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        Skip to workspace
      </a>
      <aside
        className={`bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${expanded ? 'w-60 px-4' : 'w-20 px-3'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Draft workspace"
          collapsed={!expanded}
          onToggleCollapse={() => setExpanded((value) => !value)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label="Draft workspace navigation"
        onClose={() => drawerTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Draft workspace"
          onNavigate={closeDrawer}
          onClose={closeDrawer}
        />
      </dialog>
      <div className={expanded ? 'md:ml-60' : 'md:ml-20'}>
        <AppHeader
          navigationButtonRef={drawerTrigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context="Draft workspace"
          actions={
            <>
              <HeaderActionButton
                onClick={toggleTheme}
                aria-label={
                  isDark ? 'Switch to light theme' : 'Switch to dark theme'
                }
              >
                {isDark ? (
                  <Sun size={20} aria-hidden="true" />
                ) : (
                  <Moon size={20} aria-hidden="true" />
                )}
              </HeaderActionButton>
              <AppAccountMenu
                name={user?.name ?? 'Demo preview'}
                email={user?.email}
                note={isDraftMock ? 'Demonstration account' : undefined}
                onSignOut={
                  user
                    ? () => {
                        clearSession()
                        navigate('/login')
                      }
                    : undefined
                }
                links={
                  user
                    ? []
                    : [
                        {
                          label: 'Sign in',
                          to: '/login',
                          icon: <LogIn size={17} />,
                        },
                      ]
                }
              />
            </>
          }
        />
        {isDraftMock && (
          <DemoBanner
            controls={
              <div className="flex flex-wrap items-center gap-3">
                <CustomSelect
                  label="Scenario"
                  value={ctx.scenario}
                  options={draftScenarios.map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={(value) =>
                    navigate(`/drafts?scenario=${encodeURIComponent(value)}`)
                  }
                  className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center"
                  triggerClassName="!w-56 !max-w-full"
                  menuClassName="!left-auto !w-56 !max-w-[calc(100vw-32px)]"
                />
                {location.pathname === '/drafts' && (
                  <DraftButton
                    secondary
                    disabled={reset.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Reset this demo scenario? Saved fixture input and versions will be removed.'
                        )
                      )
                        reset.mutate(undefined, {
                          onSuccess: () => navigate(href('/drafts')),
                        })
                    }}
                  >
                    Reset demo
                  </DraftButton>
                )}
              </div>
            }
          >
            <p>
              <strong>Demo · Synthetic data · No server changes.</strong> Data
              is stored in memory and resets on reload.
            </p>
          </DemoBanner>
        )}
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
