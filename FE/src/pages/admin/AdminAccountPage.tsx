import { useTranslation } from 'react-i18next'
import { AccountSettings } from '@/features/auth'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'

export default function AdminAccountPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  return (
    <AdminLayout {...nav} section="account" breadcrumb={t('navigation.accounts')}>
      <AccountSettings role="admin" />
    </AdminLayout>
  )
}
