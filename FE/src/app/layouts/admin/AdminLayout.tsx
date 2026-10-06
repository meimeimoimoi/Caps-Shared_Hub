import { useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  CreditCard,
  FileText,
  Flag,
  Moon,
  Search,
  Settings,
  Sun,
  Tag,
  UserRound,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import {
  AppHeader,
  HeaderActionButton,
} from '@/components/ui/layout/app-header'
import { AppAccountMenu } from '@/components/ui/layout/app-account-menu'
import { useTheme } from '@/hooks/useTheme'
import { useFormatters } from '@/hooks/useFormatters'
import { useAuth } from '@/features/auth'

interface AdminLayoutProps {
  section: 'pending' | 'experts'
  breadcrumb: ReactNode
  pendingCount: number
  search?: string
  onSearchChange?: (value: string) => void
  children: ReactNode
}

export function AdminLayout({
  section,
  breadcrumb,
  pendingCount,
  search,
  onSearchChange,
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation(['common', 'admin'])
  const { isDark, toggleTheme } = useTheme()
  const { number } = useFormatters()
  const { user, logout } = useAuth()
  const groups: SidebarGroup[] = [
    {
      id: 'expert-review',
      label: t('admin:navigation.expertReview'),
      items: [
        {
          id: 'pending',
          label: t('admin:navigation.pendingExperts'),
          icon: <FileText size={18} />,
          to: '/admin/experts/pending',
          active: section === 'pending',
          badge: pendingCount > 0 ? number(pendingCount) : undefined,
        },
        {
          id: 'experts',
          label: t('admin:navigation.manageExperts'),
          icon: <Users size={18} />,
          to: '/admin/experts',
          active: section === 'experts',
        },
      ],
    },
    {
      id: 'operations',
      label: t('admin:navigation.operations'),
      items: [
        { id: 'complaints', label: t('admin:navigation.complaints'), icon: <Flag size={18} /> },
        {
          id: 'payouts',
          label: t('admin:navigation.payouts'),
          icon: <CreditCard size={18} />,
        },
        { id: 'pricing', label: t('admin:navigation.pricing'), icon: <Tag size={18} /> },
      ],
    },
    {
      id: 'system',
      label: t('admin:navigation.system'),
      items: [
        { id: 'accounts', label: t('admin:navigation.accounts'), icon: <UserRound size={18} /> },
        { id: 'settings', label: t('admin:navigation.settings'), icon: <Settings size={18} /> },
      ],
    },
  ]
  const closeDrawer = () => drawer.current?.close()
  return (
    <div
      data-density="compact"
      className="bg-desk-2 text-fg selection:bg-accent-soft selection:text-accent-text min-h-svh"
    >
      <a
        href="#admin-main"
        className="focus:bg-paper sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        {t('navigation.skipWorkspace')}
      </a>
      <aside
        className={`bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${collapsed ? 'w-20 px-3' : 'w-60 px-4'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Admin"
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label="Admin"
        onClose={() => drawerTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Admin"
          onNavigate={closeDrawer}
          onClose={closeDrawer}
        />
      </dialog>
      <div className={collapsed ? 'md:ml-20' : 'md:ml-60'}>
        <AppHeader
          navigationButtonRef={drawerTrigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={<nav aria-label="Breadcrumb">{breadcrumb}</nav>}
          actionsClassName="w-full flex-wrap sm:w-auto"
          actions={
            <>
              {onSearchChange && (
                <label className="border-border-control bg-paper focus-within:outline-accent-text flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 focus-within:outline-2 focus-within:outline-offset-2 sm:w-64 lg:w-72">
                  <Search
                    size={16}
                    aria-hidden="true"
                    className="text-fg-muted shrink-0"
                  />
                  <input
                    type="search"
                    value={search ?? ''}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={t('admin:search.placeholder')}
                    aria-label={t('admin:search.placeholder')}
                    className="placeholder:text-fg-muted w-full min-w-0 bg-transparent text-sm outline-none"
                  />
                </label>
              )}
              <LanguageSwitcher />
              <HeaderActionButton
                onClick={toggleTheme}
                aria-label={t(isDark ? 'theme.light' : 'theme.dark')}
              >
                {isDark ? (
                  <Sun size={20} aria-hidden="true" />
                ) : (
                  <Moon size={20} aria-hidden="true" />
                )}
              </HeaderActionButton>
              <HeaderActionButton aria-label={t('admin:notifications.label')} className="relative">
                <Bell size={18} aria-hidden="true" />
                <span className="bg-indicator absolute top-2 right-2 size-2 rounded-full" />
              </HeaderActionButton>
              <AppAccountMenu
                name={user?.name ?? t('account.fallback')}
                email={user?.email}
                note="Admin"
                onSignOut={user ? logout : undefined}
              />
            </>
          }
        />
        <main
          id="admin-main"
          tabIndex={-1}
          className="min-w-0 px-4 py-12 md:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
