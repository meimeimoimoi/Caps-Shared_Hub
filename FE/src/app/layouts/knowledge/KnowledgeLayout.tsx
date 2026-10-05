import type { ComponentProps } from 'react'
import { BookOpen, Flag, LayoutGrid, Link2, UserRound } from 'lucide-react'
import { RoleShell, type NavGroup } from '../admin/AdminLayout'

type KnowledgeLayoutProps = Omit<
  ComponentProps<typeof RoleShell>,
  'nav' | 'initials' | 'searchPlaceholder'
> & {
  /** Mục sidebar đang mở */
  section: 'queue'
  queueCount: number
}

export function KnowledgeLayout({
  section,
  queueCount,
  ...page
}: KnowledgeLayoutProps) {
  const nav: NavGroup[] = [
    {
      group: 'Kho tri thức',
      items: [
        {
          label: 'Hàng đợi duyệt',
          icon: Flag,
          to: '/knowledge/queue',
          active: section === 'queue',
          badge: queueCount,
        },
        { label: 'Tất cả văn bản', icon: BookOpen },
        { label: 'Nguồn thu thập', icon: Link2 },
      ],
    },
    { group: 'Soạn nháp', items: [{ label: 'Template', icon: LayoutGrid }] },
    { group: 'Hệ thống', items: [{ label: 'Tài khoản', icon: UserRound }] },
  ]

  return (
    <RoleShell
      nav={nav}
      // MOCK: TODO(auth) lấy từ tài khoản Knowledge Admin đang đăng nhập
      initials="TH"
      searchPlaceholder="Tìm văn bản theo số hiệu hoặc tên"
      {...page}
    />
  )
}
