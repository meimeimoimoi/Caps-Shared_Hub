import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  LayoutTemplate,
  ListChecks,
  Moon,
  Rss,
  Search,
  Sun,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/features/auth/store/authStore'
import { AppAccountMenu } from '@/components/ui/layout/app-account-menu'
import { AppHeader, HeaderActionButton } from '@/components/ui/layout/app-header'
import { AppSidebar, type SidebarGroup } from '@/components/ui/layout/app-sidebar'
import { NotificationBell, type ShellNotification } from '../NotificationBell'

interface KnowledgeLayoutProps {
  /** Mục sidebar đang mở */
  section: 'queue' | 'sources' | 'documents'
  queueCount: number
  notifications?: ShellNotification[]
  breadcrumb: ReactNode
  /** Bỏ trống thì ẩn ô tìm kiếm */
  search?: string
  onSearchChange?: (value: string) => void
  children: ReactNode
}

/* Khung Knowledge Admin dựng trên chrome dùng chung của team (AppSidebar, AppHeader),
 * cùng cách với DraftLayout: sidebar cố định trên desktop, ngăn kéo <dialog> trên mobile. */
export function KnowledgeLayout({
  section,
  queueCount,
  notifications = [],
  breadcrumb,
  search,
  onSearchChange,
  children,
}: KnowledgeLayoutProps) {
  const { isDark, toggleTheme } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const drawer = useRef<HTMLDialogElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  const groups: SidebarGroup[] = [
    {
      id: 'knowledge',
      label: 'Kho tri thức',
      items: [
        {
          id: 'queue',
          to: '/knowledge/queue',
          label: 'Hàng đợi duyệt',
          icon: <ListChecks size={18} />,
          active: section === 'queue',
          badge: queueCount,
        },
        {
          id: 'documents',
          to: '/knowledge/documents',
          label: 'Tất cả văn bản',
          icon: <BookOpen size={18} />,
          active: section === 'documents',
        },
        {
          id: 'sources',
          to: '/knowledge/sources',
          label: 'Nguồn thu thập',
          icon: <Rss size={18} />,
          active: section === 'sources',
        },
      ],
    },
    {
      id: 'drafting',
      label: 'Soạn nháp',
      items: [
        {
          id: 'templates',
          to: '/drafts/templates',
          label: 'Template',
          icon: <LayoutTemplate size={18} />,
        },
      ],
    },
  ]
  const closeDrawer = () => drawer.current?.close()

  return (
    <div className="bg-desk text-fg selection:bg-accent-soft selection:text-accent-text min-h-svh">
      <a
        href="#knowledge-main"
        className="focus:bg-paper sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        Bỏ qua điều hướng
      </a>
      <aside
        className={`bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black py-6 md:flex ${expanded ? 'w-60 px-4' : 'w-20 px-3'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Kho tri thức"
          collapsed={!expanded}
          onToggleCollapse={() => setExpanded((v) => !v)}
        />
      </aside>
      <dialog
        ref={drawer}
        aria-label="Điều hướng kho tri thức"
        onClose={() => drawerTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel="Kho tri thức"
          onNavigate={closeDrawer}
          onClose={closeDrawer}
        />
      </dialog>

      <div className={expanded ? 'md:ml-60' : 'md:ml-20'}>
        <AppHeader
          navigationButtonRef={drawerTrigger}
          onOpenNavigation={() => drawer.current?.showModal()}
          context={<nav aria-label="Breadcrumb">{breadcrumb}</nav>}
          actions={
            <>
              {onSearchChange && (
                <label className="bg-paper border-border-control rounded-control h-control hidden w-72 items-center gap-2 border px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring) lg:flex">
                  <Search size={16} aria-hidden="true" className="text-fg-muted" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm số hiệu hoặc tên văn bản"
                    aria-label="Tìm số hiệu hoặc tên văn bản"
                    className="placeholder:text-fg-muted w-full bg-transparent text-sm outline-none"
                  />
                </label>
              )}
              <NotificationBell
                notifications={notifications}
                className="text-text-muted hover:bg-surface-muted hover:text-text-strong size-11"
              />
              <HeaderActionButton
                onClick={toggleTheme}
                aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              >
                {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
              </HeaderActionButton>
              <AppAccountMenu
                // MOCK: TODO(auth) bỏ tên mặc định khi có đăng nhập Knowledge Admin
                name={user?.name ?? 'Lê Thu Hà'}
                email={user?.email}
                note="Knowledge Admin"
                onSignOut={
                  user
                    ? () => {
                        clearSession()
                        navigate('/login')
                      }
                    : undefined
                }
              />
            </>
          }
        />
        <main id="knowledge-main" className="desk-content px-4 py-12 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
