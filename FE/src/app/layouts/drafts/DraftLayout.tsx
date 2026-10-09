import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { useDialogMotion } from '@/components/ui/motion'
import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Library, LayoutDashboard, LogIn } from 'lucide-react'
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
import { AppHeader } from '@/components/ui/layout/app-header'
import { Modal } from '@/components/ui/feedback/modal'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'

export function DraftLayout() {
  const { t } = useTranslation(['common', 'navigation'])
  const [expanded, setExpanded] = useState(true)
  const [confirmReset, setConfirmReset] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  useDialogMotion(drawer, 'drawer-left')
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
          label: t('navigation:workspaces'),
          icon: <FileText size={18} />,
          active: !location.pathname.startsWith('/drafts/templates'),
        },
        {
          id: 'templates',
          to: href('/drafts/templates'),
          label: t('navigation:templates'),
          icon: <Library size={18} />,
          active: location.pathname.startsWith('/drafts/templates'),
        },
        ...(!isDraftPreview
          ? [
              {
                id: 'dashboard',
                to: '/dashboard',
                label: t('navigation:dashboard'),
                icon: <LayoutDashboard size={18} />,
              },
            ]
          : []),
      ],
    },
  ]
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
        className={`bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${expanded ? 'w-60 px-4' : 'w-20 px-3'}`}
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
      <div className={expanded ? 'md:ml-60' : 'md:ml-20'}>
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
            onSignOut: user
              ? () => {
                  clearSession()
                  navigate('/login')
                }
              : undefined,
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
        {isDraftMock && (
          <DemoBanner
            controls={
              <div className="flex flex-wrap items-center gap-3">
                <CustomSelect
                  label={t('demo.scenario')}
                  value={ctx.scenario}
                  options={draftScenarios.map((value) => ({
                    value,
                    label: t(`navigation:draftScenarios.${value}`),
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
                    onClick={() => setConfirmReset(true)}
                  >
                    {t('actions.resetDemo')}
                  </DraftButton>
                )}
              </div>
            }
          >
            <p>{t('demo.draftDisclosure')}</p>
          </DemoBanner>
        )}
        <main
          id="draft-main"
          className="mx-auto w-full max-w-[1440px] p-5 md:p-8 lg:p-10"
        >
          <Outlet />
        </main>
      </div>
      {confirmReset && (
        <Modal
          title={t('actions.resetDemo')}
          description={t('demo.resetConfirm')}
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <DraftButton secondary onClick={() => setConfirmReset(false)}>
                {t('actions.cancel')}
              </DraftButton>
              <DraftButton
                onClick={() => {
                  setConfirmReset(false)
                  reset.mutate(undefined, {
                    onSuccess: () => navigate(href('/drafts')),
                  })
                }}
              >
                {t('actions.resetDemo')}
              </DraftButton>
            </>
          }
        />
      )}
    </div>
  )
}
