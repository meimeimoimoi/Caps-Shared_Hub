import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  FileStack,
  Briefcase,
  CreditCard,
} from 'lucide-react'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { useTranslation } from 'react-i18next'

export function ExpertSidebar({
  close,
  toggleCollapse,
  isCollapsed = false,
}: {
  close?: () => void
  toggleCollapse?: () => void
  isCollapsed?: boolean
}) {
  const { t } = useTranslation('navigation')
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
        item('/expert/overview', t('overview'), <LayoutDashboard size={18} />),
        item('/expert/queue', t('workQueue'), <Inbox size={18} />),
        item('/expert/active', t('activeCases'), <FileStack size={18} />),
      ],
    },
    {
      id: 'business',
      label: t('business'),
      items: [
        item('/expert/services', t('myServices'), <Briefcase size={18} />),
        item('/expert/income', t('income'), <CreditCard size={18} />),
      ],
    },
  ]
  return (
    <AppSidebar
      groups={groups}
      navigationLabel={t('expertPortal')}
      collapsed={isCollapsed}
      onToggleCollapse={toggleCollapse}
      onNavigate={close}
      onClose={close}
    />
  )
}
