import { useTranslation } from 'react-i18next'
import { useRef, useState, type ReactNode } from 'react'
import { BookOpen, LayoutTemplate, ListChecks, Rss, UserRound } from 'lucide-react'
import { useDialogMotion } from '@/components/ui/motion'
import { useAccount } from '@/features/auth'
import { AppHeader } from '@/components/ui/layout/app-header'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { type ShellNotification } from '../NotificationBell'

interface KnowledgeLayoutProps {
  /** Mục sidebar đang mở */
  section: 'queue' | 'sources' | 'documents' | 'account'
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
  const { t } = useTranslation('common')
  const [expanded, setExpanded] = useState(true)
  const drawer = useRef<HTMLDialogElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  // Tài khoản thật hoặc minh họa; dùng chung với trang Tài khoản nên đổi ảnh là header đổi theo
  const account = useAccount('knowledge')

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
    {
      id: 'system',
      label: 'Hệ thống',
      items: [
        {
          id: 'account',
          to: '/knowledge/account',
          label: 'Tài khoản',
          icon: <UserRound size={18} />,
          active: section === 'account',
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
          search={
            onSearchChange
              ? {
                  value: search ?? '',
                  onChange: onSearchChange,
                  label: t('search.knowledge'),
                }
              : undefined
          }
          searchLinks={groups.flatMap((group) =>
            group.items.flatMap((item) =>
              item.to ? [{ label: item.label, to: item.to }] : []
            )
          )}
          account={{
            name: account.name,
            avatarUrl: account.avatarUrl,
            onSignOut: account.logout,
            // Giống Expert: menu tài khoản luôn có lối vào trang tài khoản
            links: [
              {
                label: 'Tài khoản',
                to: '/knowledge/account',
                icon: <UserRound size={17} />,
                active: section === 'account',
              },
            ],
          }}
          notifications={notifications}
        />
        <main
          id="knowledge-main"
          className="desk-content px-4 py-12 md:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
