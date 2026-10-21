import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BriefcaseBusiness,
  FileText,
  FolderCheck,
  LayoutDashboard,
  Library,
  Sparkles,
  Store,
  UserRound,
  Wallet,
} from 'lucide-react'
import type {
  SidebarGroup,
  SidebarItem,
} from '@/components/ui/layout/app-sidebar'
import { DEMO_CASES, demoCase } from '@/features/review-case/fixtures'
import { ACTION_STATUSES } from '@/features/review-case/ui'

export type UserNavId =
  | 'dashboard'
  | 'ai-assistant'
  | 'workspaces'
  | 'templates'
  | 'marketplace'
  | 'cases'
  | 'wallet'
  | 'account'
  | 'expert-portal'

interface UserNavigationOptions {
  /** Giữ query (vd. kịch bản demo) khi chuyển giữa các trang /drafts */
  draftHref?: (path: string) => string
}

/** Sidebar duy nhất của khách hàng: dùng chung cho Tổng quan, Trợ lý AI, soạn thảo, hồ sơ thẩm định, ví, tài khoản */
export function useUserNavigation(
  active: UserNavId | undefined,
  { draftHref = (path) => path }: UserNavigationOptions = {}
): SidebarGroup[] {
  const { t } = useTranslation('navigation')
  // ponytail: đếm từ dữ liệu demo; thay bằng số từ API khi BE có review-case
  const waiting = useMemo(
    () =>
      DEMO_CASES.filter((d) => ACTION_STATUSES.includes(demoCase(d.id)!.status))
        .length,
    []
  )
  const mark = (items: SidebarItem[]) =>
    items.map((item) => ({ ...item, active: item.id === active }))
  return [
    {
      id: 'overview',
      items: mark([
        {
          id: 'dashboard',
          to: '/dashboard',
          label: t('dashboard'),
          icon: <LayoutDashboard size={18} />,
        },
        {
          id: 'ai-assistant',
          to: '/ai-assistant',
          label: t('aiAssistant'),
          icon: <Sparkles size={18} />,
        },
      ]),
    },
    {
      id: 'drafting',
      label: t('draftingGroup'),
      items: mark([
        {
          id: 'workspaces',
          to: draftHref('/drafts'),
          label: t('workspaces'),
          icon: <FileText size={18} />,
        },
        {
          id: 'templates',
          to: draftHref('/drafts/templates'),
          label: t('templates'),
          icon: <Library size={18} />,
        },
      ]),
    },
    {
      id: 'experts',
      label: t('expertsGroup'),
      items: mark([
        {
          id: 'marketplace',
          to: '/marketplace',
          label: t('marketplace'),
          icon: <Store size={18} />,
        },
        {
          id: 'cases',
          to: '/cases',
          label: t('cases'),
          icon: <FolderCheck size={18} />,
          badge: waiting || undefined,
        },
        {
          // Applying and the Expert Portal use the same account; /expert opens the application first
          id: 'expert-portal',
          to: '/expert',
          label: t('expertPortalLink'),
          icon: <BriefcaseBusiness size={18} />,
        },
      ]),
    },
    {
      id: 'account',
      label: t('accountGroup'),
      items: mark([
        {
          id: 'wallet',
          to: '/wallet',
          label: t('wallet'),
          icon: <Wallet size={18} />,
        },
        {
          id: 'account',
          to: '/account',
          label: t('account'),
          icon: <UserRound size={18} />,
        },
      ]),
    },
  ]
}
