import { useLocation } from 'react-router-dom'
import { Settings, Moon, Sun } from 'lucide-react'
import {
  AppHeader,
  HeaderActionButton,
} from '@/components/ui/layout/app-header'
import { AppAccountMenu } from '@/components/ui/layout/app-account-menu'
import { useAuth } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { isExpertDemo } from '@/lib/expert-data-source'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import { useTranslation } from 'react-i18next'

export function ExpertHeader({
  openNavigation,
  isDark,
  toggleTheme,
}: {
  openNavigation: () => void
  isDark: boolean
  toggleTheme: () => void
}) {
  const { t } = useTranslation(['common', 'navigation'])
  const { data } = useExpertContext()
  const { logout } = useAuth()
  const location = useLocation()
  return (
    <AppHeader
      context={t('navigation:expertWorkspace')}
      onOpenNavigation={openNavigation}
      navigationButtonClassName="min-[960px]:hidden"
      actions={
        <>
          <LanguageSwitcher />
          <HeaderActionButton
            onClick={toggleTheme}
            aria-label={t(isDark ? 'theme.light' : 'theme.dark')}
          >
            {isDark ? (
              <Sun size={19} aria-hidden="true" />
            ) : (
              <Moon size={19} aria-hidden="true" />
            )}
          </HeaderActionButton>
          <AppAccountMenu
            name={data?.displayName ?? t('account.fallback')}
            email={data?.email}
            note={isExpertDemo ? t('account.demo') : undefined}
            onSignOut={logout}
            links={[
              {
                label: t('navigation:settings'),
                to: `/expert/settings/account${location.search}`,
                icon: <Settings size={17} />,
                active: location.pathname.startsWith('/expert/settings'),
              },
            ]}
          />
        </>
      }
    />
  )
}
