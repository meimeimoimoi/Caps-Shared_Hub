import { useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { AppHeader } from '@/components/ui/layout/app-header'
import { useAccount, useAuth } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { useNotifications } from '@/features/notifications'
import { useTranslation } from 'react-i18next'

const pageKeys = {
  application: 'expertApplication',
  overview: 'overview',
  queue: 'workQueue',
  active: 'activeCases',
  cases: 'pages.cases',
  services: 'myServices',
  income: 'income',
  bio: 'publicProfile',
  profile: 'pages.profile',
  settings: 'settings',
} as const

export function ExpertHeader({
  openNavigation,
}: {
  openNavigation: () => void
}) {
  const { t } = useTranslation(['common', 'navigation'])
  const { data } = useExpertContext()
  const { logout } = useAuth()
  // Ảnh đại diện dùng chung với trang Settings: đổi ở đó là header đổi theo
  const { avatarUrl } = useAccount('expert')
  const bell = useNotifications()
  const location = useLocation()
  const pageKey = location.pathname.startsWith('/expert/cases/')
    ? 'pages.caseDetail'
    : (pageKeys[location.pathname.split('/')[2] as keyof typeof pageKeys] ??
      'expertWorkspace')
  return (
    <AppHeader
      context={
        <span aria-current="page" className="text-text-strong font-semibold">
          {t(`navigation:${pageKey}`)}
        </span>
      }
      notifications={bell.notifications}
      onMarkNotificationsRead={bell.onMarkRead}
      onMarkAllNotificationsRead={bell.onMarkAllRead}
      onOpenNavigation={openNavigation}
      navigationButtonClassName="min-[960px]:hidden"
      searchLinks={Object.entries(pageKeys).map(([path, key]) => ({
        label: t(`navigation:${key}`),
        to: `/expert/${path}${location.search}`,
      }))}
      account={{
        name: data?.displayName ?? t('account.fallback'),
        avatarUrl,
        onSignOut: logout,
        links: [
          {
            label: t('navigation:settings'),
            to: `/expert/settings/account${location.search}`,
            icon: <Settings size={17} />,
            active: location.pathname.startsWith('/expert/settings'),
          },
        ],
      }}
    />
  )
}
