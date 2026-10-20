import { useAuthStore } from '@/features/auth/store/authStore'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PublicFooter } from '@/components/ui/layout/public-footer'
import { PublicNavigation } from '@/components/ui/layout/public-navigation'
import '@/styles/public-site.css'
import '../styles/marketplace.css'

/* Sàn Chuyên gia dùng chung vật liệu của trang chủ (#shub-home: token, nav, footer, nút)
   để hai trang công khai là một sản phẩm; phần riêng của Sàn nằm dưới .mk. */
export function MarketplaceFrame({
  skipTarget,
  children,
}: {
  skipTarget: string
  children: ReactNode
}) {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const { t } = useTranslation('marketplace')
  return (
    <div id="shub-home" className="mk">
      <a className="skip" href={`#${skipTarget}`}>
        {t('skip')}
      </a>
      <div className="env" aria-hidden="true" />
      <PublicNavigation authenticated={authenticated} />
      {children}
      <PublicFooter anchorBase="/" />
    </div>
  )
}
