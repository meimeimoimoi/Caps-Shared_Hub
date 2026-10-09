import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Circle, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/feedback/modal'
import { authApi } from '../api/authApi'
import { passwordRequirements } from '../utils/accountValidation'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
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

/* Form đổi mật khẩu; dùng chung quy tắc mật khẩu với trang đăng ký (passwordRequirements).
 * Nút luôn bấm được: chưa đủ điều kiện thì nói rõ còn thiếu gì, đủ thì hỏi xác nhận rồi mới gửi. */
export function ChangePasswordForm() {
  const { t } = useTranslation('auth')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  /** Đã bấm nút mà chưa đủ điều kiện: hiện lý do thay vì khóa nút im lặng */
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const rules = passwordRequirements(next)
  const mismatch = confirm.length > 0 && confirm !== next
  const sameAsCurrent = next.length > 0 && next === current
  const missing = [
    !current && t('changePassword.currentRequired'),
    ...rules.filter((r) => !r.met).map((r) => t(r.key)),
    confirm !== next && t('changePassword.mismatch'),
    sameAsCurrent && t('changePassword.sameAsCurrent'),
  ].filter((m): m is string => !!m)
  const type = show ? 'text' : 'password'

  const submit = () => {
    setConfirming(false)
    setBusy(true)
    setError(null)
    authApi
      .changePassword({ currentPassword: current, newPassword: next })
      .then(() => {
        setCurrent('')
        setNext('')
        setConfirm('')
        setTried(false)
        setDone(true)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <form
        className="mt-4 max-w-md space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setDone(false)
          if (missing.length) setTried(true)
          else setConfirming(true)
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
              className={cn(
                'flex items-center gap-2',
                r.met ? 'text-success' : tried ? 'text-danger' : 'text-fg-muted'
              )}
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

        {tried && missing.length > 0 && (
          <div role="alert" className="text-danger text-sm">
            <p className="font-semibold">{t('changePassword.missingTitle')}</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
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
        <button type="submit" disabled={busy} className="btn btn-press btn-primary">
          {busy ? t('changePassword.submitting') : t('changePassword.submit')}
        </button>
      </form>

      {/* Đổi mật khẩu khó hoàn tác: hỏi lại trước khi gửi */}
      {confirming && (
        <Modal
          title={t('changePassword.confirmTitle')}
          description={t('changePassword.confirmBody')}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-press btn-secondary"
              >
                {t('changePassword.cancel')}
              </button>
              <button type="button" onClick={submit} className="btn btn-press btn-primary">
                {t('changePassword.submit')}
              </button>
            </>
          }
        />
      )}
    </>
  )
}
