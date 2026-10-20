import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { AccountSettings, hasAnyPermission, Permission, useAuthStore } from '@/features/auth'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'

export default function AdminAccountPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const user = useAuthStore((s) => s.user)
  const role = hasAnyPermission(user, [Permission.UserManage]) ? 'admin' : 'reviewer'
  if (role === 'reviewer') return <Navigate to="/reviewer/account" replace />
  return (
    <AdminLayout {...nav} section="account" breadcrumb={t('navigation.accounts')}>
      <AccountSettings role={role} />
    </AdminLayout>
  )
}
