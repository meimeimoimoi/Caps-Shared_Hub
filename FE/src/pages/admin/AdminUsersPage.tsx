import { SortableTh } from '@/components/ui/navigation/sortable-th'
import { useCallback, useState } from 'react'
import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { Toast } from '@/components/ui/feedback/toast'
import { CustomSelect } from '@/components/ui/forms/custom-select'
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
import type { ManagedUser } from '../../features/user-management/types'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'
import { isMissingEndpoint } from '@/lib/api-client'
import { OperationsUnavailable } from '@/features/disputes-escrow/components/OperationsUnavailable'

const filterClassName = 'grid w-full min-w-0 gap-2 text-sm font-semibold sm:w-72'

/* User management for every role. Expert-only actions (turning a service on/off) stay on the experts page */
export default function AdminUsersPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const users = useUsers()
  const { paged, selected } = users
  const notConnected = isMissingEndpoint(users.error)
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
      search={notConnected ? undefined : users.query}
      onSearchChange={notConnected ? undefined : users.setQuery}
    >
      <PageHeader title={t('users.title')} help={t('users.description')} />
      {notConnected ? (
        <OperationsUnavailable area="users" />
      ) : (
      <>

      <section className="paper mt-8">
        <div className="border-border-subtle flex flex-wrap items-end gap-4 border-b px-5 py-4">
          <CustomSelect
            label={t('users.role.label')}
            value={users.role}
            onChange={users.setRole}
            className={filterClassName}
            options={[
              { value: ALL, label: t('users.role.all') },
              ...USER_ROLES.map((value) => ({ value, label: t(`users.role.${value}`) })),
            ]}
          />
          <CustomSelect
            label={t('users.status.label')}
            value={users.status}
            onChange={users.setStatus}
            className={filterClassName}
            options={[
              { value: ALL, label: t('users.status.all') },
              ...(Object.keys(USER_STATUS) as ManagedUser['status'][]).map(
                (value) => ({ value, label: t(USER_STATUS[value].label) })
              ),
            ]}
          />
          {!users.error && !users.isLoading && (
            <span className="text-fg-muted num ml-auto flex min-h-11 items-center text-sm">
              {t('users.count', { count: paged.total })}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-sm">

            <caption className="sr-only">{t('users.title')}</caption>
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[23%]" />
              <col className="w-[12%]" />
              <col className="w-[23%]" />
              <col className="w-[16%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="bg-sunken text-fg-muted">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th:last-child]:px-2 [&>th]:font-semibold [&>th]:whitespace-nowrap">
                <SortableTh
                  className="text-left"
                  column="name"
                  sort={users.sort}
                  onSort={users.onSort}
                >
                  {t('users.col.name')}
                </SortableTh>
                <SortableTh
                  className="text-left"
                  column="email"
                  sort={users.sort}
                  onSort={users.onSort}
                >
                  {t('users.col.email')}
                </SortableTh>
                <SortableTh
                  className="text-left"
                  column="phone"
                  sort={users.sort}
                  onSort={users.onSort}
                >
                  {t('users.drawer.phone')}
                </SortableTh>
                <th scope="col" className="text-left">{t('users.col.role')}</th>
                <th scope="col" className="text-left">{t('users.col.status')}</th>
                <th scope="col">
                  <span className="sr-only">{t('users.col.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.isLoading && <SkeletonRows cols={6} wide={0} />}
              {paged.rows.map((u) => (
                <tr
                  key={u.id}
                  className="border-border-subtle border-t transition-colors hover:bg-sunken/60 focus-within:bg-sunken/60 [&>td]:px-4 [&>td]:py-3 [&>td:last-child]:px-2"
                >
                  <td>
                    <button
                      type="button"
                      onClick={() => users.select(u.id)}
                      aria-label={t('users.viewLabel', { name: u.name })}
                      className="text-fg-strong cursor-pointer text-left font-semibold [overflow-wrap:anywhere] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    >
                      {u.name}
                    </button>
                  </td>
                  <td className="text-fg-muted [overflow-wrap:anywhere]">{u.email}</td>
                  <td className="text-fg-muted num [overflow-wrap:anywhere]">
                    {u.phone?.trim() || t('users.drawer.notUpdated')}
                  </td>
                  <td>
                    <ul className="flex flex-wrap gap-1.5">
                      {(u.roles?.length ? u.roles : [u.role]).map((role) => (
                        <li key={role} className="border-border-subtle bg-sunken text-fg rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap">
                          {t(`users.role.${role}`)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <StatusBadge status={statusMeta(u.status)} />
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => users.select(u.id)}
                      aria-label={t('users.viewLabel', { name: u.name })}
                      title={t('users.viewLabel', { name: u.name })}
                      className="btn btn-press btn-ghost inline-flex size-11 items-center justify-center p-0"
                    >
                      <Eye size={18} aria-hidden="true" />
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
                    {users.error ? (
                      <LoadError error={users.error} />
                    ) : (
                      t('users.empty')
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!users.error && (
          <TablePager
            paged={paged}
            onPrev={users.prev}
            onNext={users.next}
            onPageChange={users.setPage}
            onPageSizeChange={users.setPageSize}
          />
        )}
      </section>
      </>
      )}

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
