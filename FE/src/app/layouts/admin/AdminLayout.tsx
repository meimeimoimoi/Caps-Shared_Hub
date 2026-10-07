import { useRef, useState, type ReactNode } from 'react'
import {
  CreditCard,
  FileText,
  Flag,
  Settings,
  Tag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { AppHeader } from '@/components/ui/layout/app-header'
import { useFormatters } from '@/hooks/useFormatters'
import { useAuth } from '@/features/auth'
import { useDialogMotion } from '@/components/ui/motion'
import { type ShellNotification } from '../NotificationBell'

export interface NavItem {
  label: string
  icon: LucideIcon
  to?: string // không có = chưa có route
  active?: boolean
  badge?: number
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

interface ShellPageProps {
  breadcrumb: ReactNode
  /** Bỏ trống thì ẩn ô tìm kiếm */
  search?: string
  onSearchChange?: (value: string) => void
  /** Danh sách trong popover chuông; có mục thì hiện chấm đỏ */
  notifications?: ShellNotification[]
  children: ReactNode
}

interface AdminLayoutProps extends ShellPageProps {
  /** Mục sidebar đang mở */
  section: 'pending' | 'experts' | 'disputes' | 'escrow' | 'pricing'
  pendingCount: number
  disputeCount?: number
}

export function AdminLayout({
  section,
  pendingCount,
  disputeCount,
  ...page
}: AdminLayoutProps) {
  const { t } = useTranslation('admin')
  const nav: NavGroup[] = [
    {
      group: t('navigation.expertReview'),
      items: [
        {
          label: t('navigation.pendingExperts'),
          icon: FileText,
          to: '/admin/experts/pending',
          active: section === 'pending',
          badge: pendingCount,
        },
        {
          label: t('navigation.manageExperts'),
          icon: Users,
          to: '/admin/experts',
          active: section === 'experts',
        },
      ],
    },
    {
      group: t('navigation.operations'),
      items: [
        {
          label: t('navigation.complaints'),
          icon: Flag,
          to: '/admin/disputes',
          active: section === 'disputes',
          badge: disputeCount,
        },
        {
          label: t('navigation.payouts'),
          icon: CreditCard,
          to: '/admin/escrow',
          active: section === 'escrow',
        },
        {
          label: t('navigation.pricing'),
          icon: Tag,
          to: '/admin/pricing',
          active: section === 'pricing',
        },
      ],
    },
    {
      group: t('navigation.system'),
      items: [
        { label: t('navigation.accounts'), icon: UserRound },
        { label: t('navigation.settings'), icon: Settings },
      ],
    },
  ]

  return <RoleShell nav={nav} initials="TA" {...page} />
}

interface RoleShellProps extends ShellPageProps {
  nav: NavGroup[]
  /** Chữ viết tắt trên avatar topbar */
  initials: string
  searchPlaceholder?: string
}

export function RoleShell({
  nav,
  initials,
  breadcrumb,
  search,
  onSearchChange,
  notifications = [],
  children,
}: RoleShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation(['common', 'admin'])
  const { number } = useFormatters()
  const { user, logout } = useAuth()
  const groups: SidebarGroup[] = nav.map(({ group, items }, groupIndex) => ({
    id: `admin-group-${groupIndex}`,
    label: group,
    items: items.map(({ label, icon: Icon, to, active, badge }, itemIndex) => ({
      id: to ?? `admin-item-${groupIndex}-${itemIndex}`,
      label,
      icon: <Icon size={18} />,
      to,
      active,
      badge: badge != null && badge > 0 ? number(badge) : undefined,
    })),
  }))
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
          search={
            onSearchChange
              ? {
                  value: search ?? '',
                  onChange: onSearchChange,
                  label: t('admin:search.placeholder'),
                }
              : undefined
          }
          searchLinks={groups.flatMap((group) =>
            group.items.flatMap((item) =>
              item.to ? [{ label: item.label, to: item.to }] : []
            )
          )}
          account={{
            name: user?.name ?? initials,
            onSignOut: user ? logout : undefined,
          }}
          notifications={notifications}
        />
        <main
          id="admin-main"
          tabIndex={-1}
          className="animate-enter min-w-0 px-4 py-12 md:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
