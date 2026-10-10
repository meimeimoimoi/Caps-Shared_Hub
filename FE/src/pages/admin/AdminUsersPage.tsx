import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { Toast } from '@/components/ui/feedback/toast'
import { TablePager } from '@/components/ui/navigation/table-pager'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import {
  ALL,
  USER_ROLES,
  USER_STATUS,
} from '../../features/user-management/constants'
import { useUsers } from '../../features/user-management/hooks/useUsers'
import { UserDrawer } from '../../features/user-management/components/UserDrawer'
import type {
  ManagedUser,
  UserRole,
} from '../../features/user-management/types'

const selectCls =
  'border-border-control rounded-control shadow-control bg-paper h-control min-w-48 border px-3 text-sm'

/* Quản lý người dùng: mọi vai trò. Thao tác riêng của chuyên gia (bật/tắt dịch vụ) vẫn ở màn Quản lý Expert */
export default function AdminUsersPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const users = useUsers()
  const { paged, selected } = users
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const statusMeta = (s: ManagedUser['status']) => ({
    ...USER_STATUS[s],
    label: t(USER_STATUS[s].label),
  })

  return (
    <AdminLayout
      {...nav}
      section="users"
      breadcrumb={t('users.title')}
      search={users.query}
      onSearchChange={users.setQuery}
    >
      <h1 className="text-h1">{t('users.title')}</h1>
      <p className="text-fg-muted mt-3 max-w-[65ch]">
        {t('users.description')}
      </p>

      <section className="paper mt-8 overflow-x-auto">
        <div className="flex flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            {t('users.role.label')}
            <select
              value={users.role}
              onChange={(e) =>
                users.setRole(e.target.value as UserRole | typeof ALL)
              }
              className={selectCls}
            >
              <option value={ALL}>{t('users.role.all')}</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`users.role.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            {t('users.status.label')}
            <select
              value={users.status}
              onChange={(e) =>
                users.setStatus(
                  e.target.value as ManagedUser['status'] | typeof ALL
                )
              }
              className={selectCls}
            >
              <option value={ALL}>{t('users.status.all')}</option>
              {(Object.keys(USER_STATUS) as ManagedUser['status'][]).map(
                (s) => (
                  <option key={s} value={s}>
                    {t(USER_STATUS[s].label)}
                  </option>
                )
              )}
            </select>
          </label>
          <span className="text-fg-muted num ml-auto text-sm">
            {t('users.count', { count: paged.total })}
          </span>
        </div>

        <table className="w-full min-w-200 text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
              <th className="text-left">{t('users.col.user')}</th>
              <th className="text-left">{t('users.col.role')}</th>
              <th className="text-left">{t('users.col.status')}</th>
              <th className="text-right">{t('users.col.created')}</th>
              <th className="text-right">{t('users.col.lastLogin')}</th>
              <th>
                <span className="sr-only">{t('users.col.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading && <SkeletonRows cols={6} wide={0} />}
            {paged.rows.map((u) => (
              <tr
                key={u.id}
                className={cn(
                  'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3',
                  selected?.id === u.id && 'bg-accent-soft'
                )}
              >
                <td>
                  <p className="text-fg-strong font-semibold">{u.name}</p>
                  <p className="text-fg-muted break-all">{u.email}</p>
                </td>
                <td>{t(`users.role.${u.role}`)}</td>
                <td>
                  <StatusBadge status={statusMeta(u.status)} />
                </td>
                <td className="num text-right">{formatDate(u.createdAt)}</td>
                <td className="num text-fg-muted text-right">
                  {u.lastLoginAt
                    ? formatDateTime(u.lastLoginAt)
                    : t('users.never')}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => users.select(u.id)}
                    aria-label={t('users.viewLabel', { name: u.name })}
                    className="btn btn-press btn-secondary"
                  >
                    {t('users.view')}
                  </button>
                </td>
              </tr>
            ))}
            {!users.isLoading && paged.rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={6}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {users.error?.message ?? t('users.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePager paged={paged} onPrev={users.prev} onNext={users.next} />
      </section>

      {selected && (
        <UserDrawer
          key={selected.id}
          user={selected}
          isSelf={selected.email === users.myEmail}
          onClose={() => users.select(null)}
          onLock={(locked, reason) =>
            users
              .setLocked(selected.id, locked, reason)
              .then(() =>
                setToast(
                  t(locked ? 'users.action.locked' : 'users.action.unlocked', {
                    name: selected.name,
                  })
                )
              )
          }
          onReset={() =>
            users
              .sendReset(selected.id)
              .then(() =>
                setToast(t('users.action.resetSent', { email: selected.email }))
              )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
