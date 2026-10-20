import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, Lock, LockOpen } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Drawer } from '@/components/ui/feedback/drawer'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { USER_STATUS } from '../constants'
import type { ManagedUser } from '../types'

type Action = 'lock' | 'unlock' | 'reset'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-strong">{children}</dd>
    </div>
  )
}

/* Chi tiết một tài khoản. Mỗi thao tác hỏi lại ngay trong ngăn kéo (bước 2) trước khi gửi:
 * khóa bắt buộc lý do, mở khóa ghi chú tùy chọn, đặt lại mật khẩu chỉ gửi email (admin không đặt hộ). */
export function UserDrawer({
  user,
  isSelf,
  onClose,
  onLock,
  onReset,
}: {
  user: ManagedUser
  /** Tài khoản đang đăng nhập: không cho tự khóa */
  isSelf: boolean
  onClose: () => void
  onLock: (locked: boolean, reason: string) => Promise<unknown>
  onReset: () => Promise<unknown>
}) {
  const { t } = useTranslation('admin')
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = user.status === 'LOCKED'

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
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  const start = (a: Action) => {
    setAction(a)
    setReason('')
    setError(null)
  }

  return (
    <Drawer
      title={user.name}
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
            {action !== 'reset' && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {action === 'lock'
                  ? t('users.action.lockReason')
                  : t('users.action.unlockNote')}
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
                />
                {action === 'lock' && (
                  <span className="text-fg-muted text-caption font-normal">
                    {t('users.action.lockReasonHint')}
                  </span>
                )}
              </label>
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
          <div className="flex w-full flex-wrap gap-2">
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
                className="btn btn-press btn-secondary"
              >
                <Lock size={16} aria-hidden="true" />
                {t('users.action.lock')}
              </button>
            )}
            <button
              type="button"
              onClick={() => start('reset')}
              className="btn btn-press btn-secondary"
            >
              <KeyRound size={16} aria-hidden="true" />
              {t('users.action.reset')}
            </button>
          </div>
        )
      }
    >
      <dl className="divide-border-subtle divide-y text-sm">
        <Row label={t('users.drawer.email')}>
          <span className="break-all">{user.email}</span>
        </Row>
        <Row label={t('users.drawer.role')}>{t(`users.role.${user.role}`)}</Row>
        <Row label={t('users.drawer.status')}>
          <StatusBadge
            status={{
              ...USER_STATUS[user.status],
              label: t(USER_STATUS[user.status].label),
            }}
          />
        </Row>
        <Row label={t('users.drawer.created')}>
          <span className="num">{formatDate(user.createdAt)}</span>
        </Row>
        <Row label={t('users.drawer.lastLogin')}>
          {user.lastLoginAt ? (
            <span className="num">{formatDateTime(user.lastLoginAt)}</span>
          ) : (
            t('users.never')
          )}
        </Row>
        {user.lockReason && (
          <Row label={t('users.drawer.lockReason')}>{user.lockReason}</Row>
        )}
      </dl>
      {isSelf && (
        <p className="text-fg-muted mt-3 text-sm">{t('users.drawer.self')}</p>
      )}
      {user.role === 'EXPERT' && (
        <Link
          to="/admin/experts"
          className="text-accent-text mt-3 inline-block text-sm underline underline-offset-4"
        >
          {t('users.drawer.expertLink')}
        </Link>
      )}

      <h3 className="text-fg-strong mt-6 text-sm font-semibold">
        {t('users.drawer.history')}
      </h3>
      <ol className="mt-2 space-y-2 text-sm">
        {user.history.map((h) => (
          <li
            key={h.at + h.text}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3"
          >
            <span className="text-fg-muted num">{formatDateTime(h.at)}</span>
            <span>
              <span className="text-fg-strong">{h.actor}</span> · {h.text}
            </span>
          </li>
        ))}
      </ol>
    </Drawer>
  )
}
