import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Circle, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi } from '../api/authApi'
import { passwordRequirements } from '../utils/accountValidation'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-danger text-caption font-normal">
          {error}
        </span>
      )}
    </label>
  )
}

/* Form đổi mật khẩu; dùng chung quy tắc mật khẩu với trang đăng ký (passwordRequirements) */
export function ChangePasswordForm() {
  const { t } = useTranslation('auth')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const rules = passwordRequirements(next)
  const rulesMet = rules.every((r) => r.met)
  const mismatch = confirm.length > 0 && confirm !== next
  const sameAsCurrent = next.length > 0 && next === current
  const canSubmit = !!current && rulesMet && confirm === next && !sameAsCurrent && !busy
  const type = show ? 'text' : 'password'

  return (
    <form
      className="mt-4 max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        setBusy(true)
        setError(null)
        setDone(false)
        authApi
          .changePassword({ currentPassword: current, newPassword: next })
          .then(() => {
            setCurrent('')
            setNext('')
            setConfirm('')
            setDone(true)
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false))
      }}
    >
      <Field label={t('changePassword.current')}>
        <input
          type={type}
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field
        label={t('changePassword.new')}
        error={sameAsCurrent ? t('changePassword.sameAsCurrent') : undefined}
      >
        <input
          type={type}
          autoComplete="new-password"
          required
          aria-describedby="new-password-rules"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputCls}
        />
      </Field>
      <ul
        id="new-password-rules"
        aria-label={t('changePassword.rulesLabel')}
        className="grid gap-1 text-sm sm:grid-cols-2"
      >
        {rules.map((r) => (
          <li
            key={r.key}
            className={cn('flex items-center gap-2', r.met ? 'text-success' : 'text-fg-muted')}
          >
            {r.met ? (
              <CircleCheck size={15} aria-hidden="true" />
            ) : (
              <Circle size={15} aria-hidden="true" />
            )}
            {t(r.key)}
            <span className="sr-only">
              , {r.met ? t('changePassword.met') : t('changePassword.notMet')}
            </span>
          </li>
        ))}
      </ul>
      <Field
        label={t('changePassword.confirm')}
        error={mismatch ? t('changePassword.mismatch') : undefined}
      >
        <input
          type={type}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
      </Field>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="accent-ink size-4"
        />
        {t('changePassword.showPasswords')}
      </label>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-success flex items-center gap-2 text-sm">
          <Check size={16} aria-hidden="true" />
          {t('changePassword.success')}
        </p>
      )}
      <button type="submit" disabled={!canSubmit} className="btn btn-press btn-primary">
        {busy ? t('changePassword.submitting') : t('changePassword.submit')}
      </button>
    </form>
  )
}
