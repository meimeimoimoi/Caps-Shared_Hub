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
  CalendarCheck,
} from 'lucide-react'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { useTranslation } from 'react-i18next'
import { useCapabilities, type Capability } from '@/features/expert-context'
import { useExpertDashboard } from '@/features/expert-dashboard/hooks/useExpertDashboard'

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
  // Counts like the admin sidebar; a new notification refetches the dashboard, so they stay current
  const dashboard = useExpertDashboard().data
  const work = dashboard?.queue.status === 'available' ? dashboard.queue.data.items : []
  const waiting = work.filter((i) => i.status === 'PENDING_EXPERT_RESPONSE').length
  // Cases the expert has to move: write the review, or answer a dispute
  const toDo = work.filter((i) => i.status === 'IN_REVIEW' || i.status === 'DISPUTED').length
  // Items whose capability the server has not granted yet stay visible but locked
  const item = (
    to: string,
    label: string,
    icon: SidebarGroup['items'][number]['icon'],
    requires: Capability,
    count = 0
  ) => {
    const open = has(requires)
    return {
      id: to,
      to: open ? to : undefined,
      label,
      icon,
      badge: open && count > 0 ? count : undefined,
      active: open && (pathname === to || pathname.startsWith(`${to}/`)),
      lockedHint: open ? undefined : t('lockedUntilApproved'),
    }
  }
  const groups: SidebarGroup[] = [
    {
      id: 'workspace',
      label: t('expertWork'),
      items: [
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
          'cases.work',
          waiting
        ),
        item(
          '/expert/active',
          t('activeCases'),
          <FileStack size={18} />,
          'cases.work',
          toDo
        ),
      ],
    },
    {
      id: 'qualifications',
      label: t('expertReadiness'),
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
      ],
    },
    {
      id: 'business',
      label: t('expertServiceOperations'),
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
          <CalendarCheck size={18} />,
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
