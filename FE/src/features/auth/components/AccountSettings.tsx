import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, LogOut } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import type { ThemePreference } from '@/lib/theme'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { LanguageSwitcher } from '@/components/ui/layout/language-switcher'
import { useAccount, type AccountRole } from '../hooks/useAccount'
import { AvatarUploader } from './AvatarUploader'
import { ChangePasswordForm } from './ChangePasswordForm'

const ROLE_LABEL = {
  admin: 'accountSettings.roleAdmin',
  knowledge: 'accountSettings.roleKnowledge',
  expert: 'accountSettings.roleExpert',
} as const satisfies Record<AccountRole, string>

/* Một dòng nhãn bên trái, nội dung bên phải; xếp dọc trên màn hẹp */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-6">
      <p className="text-fg-strong text-sm font-semibold">{label}</p>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  )
}

/* Thân trang "Tài khoản của tôi" dùng chung mọi vai trò; mỗi vai trò bọc trong layout của mình */
export function AccountSettings({ role }: { role: AccountRole }) {
  const { t } = useTranslation('auth')
  const account = useAccount(role)
  const { preference, setPreference } = useTheme()
  useEffect(() => {
    document.title = `${t('accountSettings.title')} | Shared Hub`
  }, [t])

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('accountSettings.themeSystem') },
    { value: 'light', label: t('accountSettings.themeLight') },
    { value: 'dark', label: t('accountSettings.themeDark') },
  ]

  return (
    <>
      <h1 className="text-h1">{t('accountSettings.title')}</h1>
      <p className="text-fg-muted mt-3 max-w-[65ch]">{t('accountSettings.description')}</p>

      <div className="mt-8 max-w-3xl space-y-6">
        <section className="paper p-5 md:p-6" aria-labelledby="account-profile">
          <h2 id="account-profile" className="text-h2">
            {t('accountSettings.profile')}
          </h2>
          <div className="mt-4">
            <AvatarUploader
              name={account.name}
              avatarUrl={account.avatarUrl}
              onChange={account.saveAvatar}
            />
          </div>
          <div className="divide-border-subtle border-border-subtle mt-5 divide-y border-t">
            <Row label={t('accountSettings.fullName')}>
              {account.name}
              {account.isDemo && (
                <span className="text-warning text-caption ml-2">
                  · {t('accountSettings.demo')}
                </span>
              )}
            </Row>
            <Row label={t('accountSettings.email')}>
              <span className="break-all">{account.email}</span>
            </Row>
            <Row label={t('accountSettings.role')}>{t(ROLE_LABEL[role])}</Row>
          </div>
          <div className="bg-sunken rounded-surface mt-4 flex gap-2 p-3 text-sm">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-fg-strong font-semibold">{t('accountSettings.readOnlyTitle')}</p>
              <p className="text-fg-muted">{t('accountSettings.readOnlyBody')}</p>
            </div>
          </div>
        </section>

        <section className="paper p-5 md:p-6" aria-labelledby="account-security">
          <h2 id="account-security" className="text-h2">
            {t('changePassword.title')}
          </h2>
          <p className="text-fg-muted mt-1 text-sm">{t('changePassword.description')}</p>
          <ChangePasswordForm />
        </section>

        <section className="paper p-5 md:p-6" aria-labelledby="account-preferences">
          <h2 id="account-preferences" className="text-h2">
            {t('accountSettings.preferences')}
          </h2>
          <p className="text-fg-muted mt-1 text-sm">{t('accountSettings.preferencesHint')}</p>
          <div className="divide-border-subtle mt-2 divide-y">
            <Row label={t('accountSettings.language')}>
              <LanguageSwitcher />
            </Row>
            <Row label={t('accountSettings.theme')}>
              <CustomSelect
                label={t('accountSettings.theme')}
                value={preference}
                options={themeOptions}
                onChange={setPreference}
                className="relative text-sm [&>span]:sr-only"
                // Cùng độ rộng ô Ngôn ngữ (LanguageSwitcher dùng !w-36) cho thẳng hàng
                triggerClassName="!w-36"
                menuClassName="!w-44 !rounded-xl !p-1.5"
              />
            </Row>
          </div>
        </section>

        {account.logout && (
          <section className="paper p-5 md:p-6" aria-labelledby="account-session">
            <h2 id="account-session" className="text-h2">
              {t('accountSettings.session')}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-fg-muted text-sm">{t('accountSettings.sessionHint')}</p>
              <button
                type="button"
                onClick={account.logout}
                className="btn btn-press btn-secondary"
              >
                <LogOut size={16} aria-hidden="true" />
                {t('accountSettings.signOut')}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
