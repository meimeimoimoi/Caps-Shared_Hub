import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  FileText,
  Flag,
  PanelLeft,
  Search,
  Settings,
  Tag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  children: ReactNode
}

interface AdminLayoutProps extends ShellPageProps {
  /** Mục sidebar đang mở */
  section: 'pending' | 'experts' | 'disputes' | 'escrow'
  pendingCount: number
  disputeCount?: number
}

export function AdminLayout({
  section,
  pendingCount,
  disputeCount,
  ...page
}: AdminLayoutProps) {
  const nav: NavGroup[] = [
    {
      group: 'Xét duyệt Expert',
      items: [
        {
          label: 'Hồ sơ chờ duyệt',
          icon: FileText,
          to: '/admin/experts/pending',
          active: section === 'pending',
          badge: pendingCount,
        },
        {
          label: 'Quản lý Expert',
          icon: Users,
          to: '/admin/experts',
          active: section === 'experts',
        },
      ],
    },
    {
      group: 'Vận hành',
      items: [
        {
          label: 'Khiếu nại',
          icon: Flag,
          to: '/admin/disputes',
          active: section === 'disputes',
          badge: disputeCount,
        },
        {
          label: 'Escrow và chi trả',
          icon: CreditCard,
          to: '/admin/escrow',
          active: section === 'escrow',
        },
        { label: 'Khung giá dịch vụ', icon: Tag },
      ],
    },
    {
      group: 'Hệ thống',
      items: [
        { label: 'Tài khoản', icon: UserRound },
        { label: 'Cấu hình', icon: Settings },
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

/* Khung sidebar + topbar dùng chung cho các vai trò quản trị (Admin, Knowledge Admin) */
export function RoleShell({
  nav,
  initials,
  searchPlaceholder = 'Tìm theo tên hoặc email',
  breadcrumb,
  search,
  onSearchChange,
  children,
}: RoleShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div data-density="compact" className="bg-desk text-fg flex min-h-dvh">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'on-ink bg-ink text-paper sticky top-0 flex h-dvh shrink-0 flex-col px-4 py-5 max-md:w-18',
          collapsed ? 'w-18' : 'w-56'
        )}
      >
        <div className="border-ink-2 flex items-center gap-3 border-b px-2 pb-5">
          <span className="text-base font-extrabold tracking-tight">
            {collapsed ? (
              'S'
            ) : (
              <>
                <span className="md:hidden">S</span>
                <span className="max-md:hidden">SHFT</span>
              </>
            )}
            <span className="bg-indicator ml-0.5 inline-block size-1.5 align-middle" />
          </span>
          {!collapsed && (
            <span className="text-fg-inverse-muted text-caption max-md:hidden">
              Admin
            </span>
          )}
        </div>

        <nav
          aria-label="Admin"
          className="mt-5 flex-1 space-y-6 overflow-y-auto"
        >
          {nav.map(({ group, items }) => (
            <div key={group}>
              {!collapsed && (
                <p className="text-fg-inverse-muted text-caption mb-2 px-2 font-semibold max-md:hidden">
                  {group}
                </p>
              )}
              <ul className="space-y-1">
                {items.map(({ label, icon: Icon, to, active, badge }) => (
                  <li key={label}>
                    {/* Mục không có `to` là chưa có route */}
                    {to ? (
                      <Link
                        to={to}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? label : undefined}
                        className={cn(
                          'rounded-control flex items-center gap-3 border-l-2 px-2 py-2.5 text-sm no-underline',
                          active
                            ? 'bg-ink-2 border-indicator text-paper font-semibold'
                            : 'text-fg-inverse-muted hover:bg-ink-2 hover:text-paper border-transparent'
                        )}
                      >
                        <Icon
                          size={17}
                          aria-hidden="true"
                          className="shrink-0"
                        />
                        <span
                          className={cn(
                            'flex-1 max-md:sr-only',
                            collapsed && 'sr-only'
                          )}
                        >
                          {label}
                        </span>
                        {!collapsed && !!badge && (
                          <span className="bg-accent text-caption num grid size-5 place-items-center rounded-full font-bold max-md:hidden">
                            {badge}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title={collapsed ? label : undefined}
                        className="text-fg-inverse-muted rounded-control flex w-full items-center gap-3 px-2 py-2.5 text-left text-sm"
                      >
                        <Icon
                          size={17}
                          aria-hidden="true"
                          className="shrink-0"
                        />
                        <span
                          className={cn(
                            'flex-1 max-md:sr-only',
                            collapsed && 'sr-only'
                          )}
                        >
                          {label}
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className="text-fg-inverse-muted hover:bg-ink-2 rounded-control mx-auto p-2 max-md:hidden"
        >
          <PanelLeft size={16} aria-hidden="true" />
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Topbar ── */}
        <header className="topbar gap-4 px-4 md:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="text-fg-muted mr-auto text-sm"
          >
            {breadcrumb}
          </nav>
          {onSearchChange && (
            <label className="bg-paper border-border-control rounded-control shadow-control h-control flex w-full max-w-full items-center gap-2 border px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring)">
              <Search size={16} aria-hidden="true" className="text-fg-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="placeholder:text-fg-muted w-full bg-transparent text-sm outline-none"
              />
            </label>
          )}
          <button
            type="button"
            aria-label="Thông báo"
            className="rounded-control relative p-1"
          >
            <Bell size={18} aria-hidden="true" />
            <span className="bg-indicator absolute top-0.5 right-0.5 size-2 rounded-full" />
          </button>
          <span className="bg-paper text-caption grid size-8 place-items-center rounded-full font-semibold">
            {initials}
          </span>
        </header>

        <main className="desk-content flex-1 px-4 py-12 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
