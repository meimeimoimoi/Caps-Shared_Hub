import { useState, type ReactNode } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  title: string
  pendingCount: number
  search: string
  onSearchChange: (value: string) => void
  children: ReactNode
}

export function AdminLayout({ title, pendingCount, search, onSearchChange, children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  const nav = [
    {
      group: 'Xét duyệt Expert',
      items: [
        { label: 'Hồ sơ chờ duyệt', icon: FileText, active: true, badge: pendingCount },
        { label: 'Quản lý Expert', icon: Users },
      ],
    },
    {
      group: 'Vận hành',
      items: [
        { label: 'Khiếu nại', icon: Flag },
        { label: 'Hoàn tiền và chi trả', icon: CreditCard },
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

  return (
    <div className="bg-ex-bg text-ex-ink flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'sticky top-0 flex h-screen shrink-0 flex-col bg-black px-4 py-5 text-white transition-[width]',
          collapsed ? 'w-[72px]' : 'w-[224px]',
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/15 px-2 pb-5">
          <span className="text-lg font-extrabold tracking-tight">
            {collapsed ? 'S' : 'SHFT'}
            <span className="bg-ex-accent ml-0.5 inline-block size-1.5 align-middle" />
          </span>
          {!collapsed && <span className="text-xs text-white/70">Admin</span>}
        </div>

        <nav aria-label="Admin" className="mt-5 flex-1 space-y-6 overflow-y-auto">
          {nav.map(({ group, items }) => (
            <div key={group}>
              {!collapsed && (
                <p className="mb-2 px-2 text-xs font-semibold text-white/60">{group}</p>
              )}
              <ul className="space-y-1">
                {items.map(({ label, icon: Icon, active, badge }) => (
                  <li key={label}>
                    {/* Chỉ "Hồ sơ chờ duyệt" có trang; các mục khác chưa có route */}
                    <button
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      disabled={!active}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm',
                        active
                          ? 'border-ex-accent border-l-2 bg-white/10 font-semibold'
                          : 'text-white/80',
                      )}
                    >
                      <Icon size={17} aria-hidden="true" className="shrink-0" />
                      {!collapsed && <span className="flex-1">{label}</span>}
                      {!collapsed && !!badge && (
                        <span className="bg-ex-accent grid size-5 place-items-center rounded-full text-[11px] font-bold">
                          {badge}
                        </span>
                      )}
                    </button>
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
          className="mx-auto rounded p-2 text-white/70 hover:bg-white/10"
        >
          <PanelLeft size={16} aria-hidden="true" />
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ── Topbar ── */}
        <header className="border-ex-border flex items-center gap-4 border-b px-7 py-4">
          <span className="text-ex-muted text-sm">{title}</span>
          <label className="bg-ex-note-bg ml-auto flex w-full max-w-[265px] items-center gap-2 rounded-md px-3 py-2">
            <Search size={16} aria-hidden="true" className="text-ex-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo tên hoặc email"
              aria-label="Tìm theo tên hoặc email"
              className="placeholder:text-ex-muted w-full bg-transparent text-sm outline-none"
            />
          </label>
          <button type="button" aria-label="Thông báo" className="relative p-1">
            <Bell size={18} aria-hidden="true" />
            <span className="bg-ex-accent absolute top-0.5 right-0.5 size-2 rounded-full" />
          </button>
          <span className="bg-ex-panel grid size-8 place-items-center rounded-full text-xs font-semibold">
            TA
          </span>
        </header>

        <main className="px-7 py-8">{children}</main>
      </div>
    </div>
  )
}
