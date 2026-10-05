import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  FileStack,
  Briefcase,
  CreditCard,
} from 'lucide-react'
import { AppSidebar, type SidebarGroup } from '@/components/ui/layout/app-sidebar'

export function ExpertSidebar({
  close,
  toggleCollapse,
  isCollapsed = false,
}: {
  close?: () => void
  toggleCollapse?: () => void
  isCollapsed?: boolean
}) {
  const { pathname } = useLocation()
  const item = (
    to: string,
    label: string,
    icon: SidebarGroup['items'][number]['icon']
  ) => ({
    id: to,
    to,
    label,
    icon,
    active: pathname === to || pathname.startsWith(`${to}/`),
  })
  const groups: SidebarGroup[] = [
    {
      id: 'workspace',
      items: [
        item('/expert/overview', 'Overview', <LayoutDashboard size={18} />),
        item('/expert/queue', 'Work Queue', <Inbox size={18} />),
        item('/expert/active', 'Active Cases', <FileStack size={18} />),
      ],
    },
    {
      id: 'business',
      label: 'Business',
      items: [
        item('/expert/services', 'My Services', <Briefcase size={18} />),
        item('/expert/income', 'Income', <CreditCard size={18} />),
      ],
    },
  ]
  return (
    <AppSidebar
      groups={groups}
      navigationLabel="Expert Portal"
      collapsed={isCollapsed}
      onToggleCollapse={toggleCollapse}
      onNavigate={close}
      onClose={close}
    />
  )
}
