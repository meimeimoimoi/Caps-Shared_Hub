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

export function ExpertHeader({
  openNavigation,
  isDark,
  toggleTheme,
  lang,
  toggleLang,
}: {
  openNavigation: () => void
  isDark: boolean
  toggleTheme: () => void
  lang: 'vi' | 'en'
  toggleLang: () => void
}) {
  const { data } = useExpertContext()
  const { logout } = useAuth()
  const location = useLocation()
  return (
    <AppHeader
      context="Expert workspace"
      onOpenNavigation={openNavigation}
      navigationButtonClassName="min-[960px]:hidden"
      actions={
        <>
          <HeaderActionButton onClick={toggleLang} aria-label="Toggle language">
            {lang === 'vi' ? 'VI' : 'EN'}
          </HeaderActionButton>
          <HeaderActionButton
            onClick={toggleTheme}
            aria-label={
              isDark ? 'Switch to light theme' : 'Switch to dark theme'
            }
          >
            {isDark ? (
              <Sun size={19} aria-hidden="true" />
            ) : (
              <Moon size={19} aria-hidden="true" />
            )}
          </HeaderActionButton>
          <AppAccountMenu
            name={data?.displayName ?? 'Your account'}
            email={data?.email}
            note={isExpertDemo ? 'Demonstration account' : undefined}
            onSignOut={logout}
            links={[
              {
                label: 'Settings',
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
