import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, Lock, LockOpen } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Modal } from '@/components/ui/feedback/modal'
import { FormField } from '@/components/ui/forms/form-field'
import { Pagination } from '@/components/ui/navigation/pagination'
import { usePagination } from '@/hooks/usePagination'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { USER_STATUS } from '../constants'
import type { ManagedUser } from '../types'

type Action = 'lock' | 'unlock' | 'reset'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-4">
      <dt className="text-fg-muted text-xs font-medium">{label}</dt>
      <dd className="text-fg-strong min-w-0 font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

// Confirm account actions inside the detail modal before submitting.
export function UserDrawer({
  user,
  isSelf,
  onClose,
  onLock,
  onReset,
}: {
  user: ManagedUser
  /** Prevent the signed-in account from locking itself. */
  isSelf: boolean
  onClose: () => void
  onLock: (locked: boolean, reason: string) => Promise<unknown>
  onReset: () => Promise<unknown>
}) {
  const { t } = useTranslation(['admin', 'common'])
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initials = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const locked = user.status === 'LOCKED'
  const history = usePagination(user.history ?? [], user.id, 5)

  const run = () => {
    if (action === 'lock' && !reason.trim())
      return setError(t('users.action.lockReason'))
    setBusy(true)
    setError(null)
    const done =
      action === 'reset' ? onReset() : onLock(action === 'lock', reason.trim())
    done
      .then(() => {
        setAction(null)
        setReason('')
      })
      .catch(() => setError(t('common:states.actionFailed')))
      .finally(() => setBusy(false))
  }

  const start = (a: Action) => {
    setAction(a)
    setReason('')
    setError(null)
  }

  return (
    <Modal
      size="md"
      preventClose={busy}
      title={
        <span className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="bg-accent-soft text-accent-text font-num flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
            {initials || 'U'}
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{user.name}</span>
        </span>
      }
      onClose={onClose}
      footer={
        action ? (
          <div className="w-full space-y-3">
            <div>
              <p className="text-fg-strong font-semibold">
                {action === 'lock'
                  ? t('users.action.lockTitle', { name: user.name })
                  : action === 'unlock'
                    ? t('users.action.unlockTitle', { name: user.name })
                    : t('users.action.resetTitle')}
              </p>
              <p className="text-fg-muted mt-1 text-sm">
                {action === 'lock'
                  ? t('users.action.lockBody')
                  : action === 'unlock'
                    ? t('users.action.unlockBody')
                    : t('users.action.resetBody', { email: user.email })}
              </p>
            </div>
            {action === 'lock' && (
              <FormField label={t('users.action.lockReason')} help={t('users.action.lockReasonHint')} className="!mb-0">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
                />
              </FormField>
            )}
            {error && (
              <p role="alert" className="text-danger text-sm">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={busy}
                className="btn btn-press btn-secondary"
              >
                {t('users.action.cancel')}
              </button>
              <button
                type="button"
                onClick={run}
                disabled={busy}
                className={`btn btn-press ${action === 'lock' ? 'bg-danger text-paper' : 'btn-primary'}`}
              >
                {action === 'lock'
                  ? t('users.action.lockConfirm')
                  : action === 'unlock'
                    ? t('users.action.unlockConfirm')
                    : t('users.action.resetConfirm')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {locked ? (
              <button
                type="button"
                onClick={() => start('unlock')}
                className="btn btn-press btn-secondary"
              >
                <LockOpen size={16} aria-hidden="true" />
                {t('users.action.unlock')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => start('lock')}
                disabled={isSelf}
                title={isSelf ? t('users.drawer.self') : undefined}
                className="btn btn-press btn-secondary text-danger hover:bg-danger-soft"
              >
                <Lock size={16} aria-hidden="true" />
                {t('users.action.lock')}
              </button>
            )}
            <button
              type="button"
              onClick={() => start('reset')}
              disabled={locked}
              className="btn btn-press btn-secondary order-first"
            >
              <KeyRound size={16} aria-hidden="true" />
              {t('users.action.reset')}
            </button>
          </div>
        )
      }
    >
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusBadge
          status={{
            ...USER_STATUS[user.status],
            label: t(USER_STATUS[user.status].label),
          }}
        />
        <ul aria-label={t('users.drawer.role')} className="flex flex-wrap gap-2">
          {(user.roles?.length ? user.roles : [user.role]).map((role) => (
            <li key={role} className="border-border-subtle text-fg rounded-md border px-2.5 py-1 text-xs font-medium">
              {t(`users.role.${role}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-sunken mt-6 rounded-xl px-5">
        <dl className="border-border-subtle grid gap-x-6 border-b text-sm sm:grid-cols-2">
          <Row label={t('users.drawer.email')}>
            {user.email}
          </Row>
          <Row label={t('users.drawer.phone')}>
            {user.phone?.trim() || t('users.drawer.notUpdated')}
          </Row>
        </dl>
        <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
          <Row label={t('users.drawer.created')}>
            <time dateTime={user.createdAt} className="num">{formatDate(user.createdAt)}</time>
          </Row>
          <Row label={t('users.drawer.lastLogin')}>
            {user.lastLoginAt ? (
              <time dateTime={user.lastLoginAt} className="num">{formatDateTime(user.lastLoginAt)}</time>
            ) : (
              t('users.never')
            )}
          </Row>
        </dl>
      </div>
      {user.lockReason && (
        <dl className="bg-danger-soft text-sm mt-4 rounded-xl px-5">
          <Row label={t('users.drawer.lockReason')}>{user.lockReason}</Row>
        </dl>
      )}
      {isSelf && (
        <p className="text-fg-muted mt-3 text-sm">{t('users.drawer.self')}</p>
      )}
      {(user.roles ?? [user.role]).includes('EXPERT') && (
        <Link
          to="/admin/experts"
          className="text-accent-text mt-3 inline-block text-sm underline underline-offset-4"
        >
          {t('users.drawer.expertLink')}
        </Link>
      )}

      {!!user.history?.length && (
      <>
      <h3 className="text-fg-strong mt-6 text-sm font-semibold">
        {t('users.drawer.history')}
      </h3>
      <ol className="mt-2 space-y-2 text-sm">
        {history.rows.map((h) => (
          <li
            key={h.at + h.text}
            className="grid gap-1 [overflow-wrap:anywhere] sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
          >
            <span className="text-fg-muted num">{formatDateTime(h.at)}</span>
            <span>
              <span className="text-fg-strong">{h.actor}</span> · {h.text}
            </span>
          </li>
        ))}
      </ol>
      {history.pageCount > 1 && (
        <Pagination
          page={history.page}
          pageSize={history.pageSize}
          total={history.total}
          onPageChange={history.setPage}
        />
      )}
      </>
      )}
    </Modal>
  )
}
