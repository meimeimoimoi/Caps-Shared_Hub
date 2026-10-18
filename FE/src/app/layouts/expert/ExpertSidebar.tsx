import { useLocation } from 'react-router-dom'
import {
  ClipboardCheck,
  LayoutDashboard,
  Inbox,
  FileStack,
  Briefcase,
  CreditCard,
  IdCard,
  BadgeCheck,
  CalendarClock,
} from 'lucide-react'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { useTranslation } from 'react-i18next'
import { useCapabilities, type Capability } from '@/features/expert-context'

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
  const { has } = useCapabilities()
  // Items whose capability the server has not granted yet stay visible but locked
  const item = (
    to: string,
    label: string,
    icon: SidebarGroup['items'][number]['icon'],
    requires: Capability
  ) => {
    const open = has(requires)
    return {
      id: to,
      to: open ? to : undefined,
      label,
      icon,
      active: open && (pathname === to || pathname.startsWith(`${to}/`)),
      lockedHint: open ? undefined : t('lockedUntilApproved'),
    }
  }
  const groups: SidebarGroup[] = [
    {
      id: 'workspace',
      items: [
        item(
          '/expert/application',
          t('expertApplication'),
          <ClipboardCheck size={18} />,
          'application.view'
        ),
        item(
          '/expert/qualifications',
          t('expertQualifications'),
          <BadgeCheck size={18} />,
          'application.view'
        ),
        item(
          '/expert/overview',
          t('overview'),
          <LayoutDashboard size={18} />,
          'cases.work'
        ),
        item(
          '/expert/queue',
          t('workQueue'),
          <Inbox size={18} />,
          'cases.work'
        ),
        item(
          '/expert/active',
          t('activeCases'),
          <FileStack size={18} />,
          'cases.work'
        ),
      ],
    },
    {
      id: 'business',
      label: t('business'),
      items: [
        item(
          '/expert/services',
          t('myServices'),
          <Briefcase size={18} />,
          'services.manage'
        ),
        item(
          '/expert/availability',
          t('availability'),
          <CalendarClock size={18} />,
          'services.manage'
        ),
        item(
          '/expert/income',
          t('income'),
          <CreditCard size={18} />,
          'income.view'
        ),
        item(
          '/expert/bio',
          t('publicProfile'),
          <IdCard size={18} />,
          'profile.public'
        ),
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
