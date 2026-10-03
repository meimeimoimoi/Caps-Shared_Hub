import { useId, useState, type ChangeEvent, type FormEvent, type Ref } from 'react'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isValidEmail, validateLogin, type LoginFormValues } from '@/utils/validators'
import { GoogleIcon } from './GoogleIcon'
import { BackButton } from './BackButton'

export type EmailLoginFormProps = {
  onBack: () => void
  onGoogle: () => void
  onSubmit: (data: LoginFormValues) => void
  className?: string
  emailInputRef?: Ref<HTMLInputElement>
}

const JAKARTA = "[font-family:'Plus_Jakarta_Sans',sans-serif]"
const INTER = '[font-family:Inter,sans-serif]'

const LABEL_CLASS = cn(
  'block text-[12px] font-semibold tracking-[-0.01em] text-white/85 mb-[7px]',
  JAKARTA,
)

const INPUT_CLASS =
  'peer w-full h-[50px] pl-11 pr-[14px] rounded-xl border border-white/14 bg-white/5 text-sm font-medium text-white outline-none backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] placeholder:text-white/35 [transition:border-color_.15s,box-shadow_.15s,background_.15s] focus:border-[var(--accent)] focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(232,93,38,.22)]'

const INPUT_ERROR_CLASS = 'border-[var(--err)] shadow-[0_0_0_3px_rgba(255,107,107,.2)]'

const FIELD_ICON_CLASS =
  'pointer-events-none absolute left-[14px] text-white/40 transition-colors peer-focus:text-[var(--accent)]'

const ERROR_CLASS = 'mt-1.5 text-[12px] leading-[1.4] text-[var(--err)]'

const LINK_CLASS =
  'text-[var(--link)] font-medium no-underline underline-offset-2 transition-opacity hover:underline hover:opacity-80'

export function EmailLoginForm({
  onBack,
  onGoogle,
  onSubmit,
  className,
  emailInputRef,
}: EmailLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [pwError, setPwError] = useState<string | undefined>(undefined)
  const [touchedEmail, setTouchedEmail] = useState(false)
  const [touchedPw, setTouchedPw] = useState(false)

  const emailId = useId()
  const pwId = useId()
  const emailErrId = `${emailId}-error`
  const pwErrId = `${pwId}-error`

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setEmailError(undefined)
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setPwError(undefined)
  }

  function handleEmailBlur() {
    setTouchedEmail(true)
    setEmailError(isValidEmail(email) ? undefined : validateLogin({ email, password }).email)
  }

  function handlePasswordBlur() {
    setTouchedPw(true)
    setPwError(validateLogin({ email, password }).password)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouchedEmail(true)
    setTouchedPw(true)
    const errors = validateLogin({ email, password })
    setEmailError(errors.email)
    setPwError(errors.password)
    if (errors.email || errors.password) return
    onSubmit({ email: email.trim(), password })
  }

  return (
    <div
      className={cn(
        'relative z-2 w-full max-w-[440px] animate-[cardIn_.45s_cubic-bezier(.2,.8,.25,1)]',
        className,
      )}
    >
      <div className="glass-card-fallback relative w-full rounded-3xl border border-white/14 bg-[rgba(20,20,22,.42)] px-8 pt-9 pb-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,.55),0_4px_12px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.10)] backdrop-blur-[28px] backdrop-saturate-150 [-webkit-backdrop-filter:blur(28px)_saturate(1.5)] max-[420px]:rounded-[20px] max-[420px]:px-[22px] max-[420px]:pt-8 max-[420px]:pb-[26px]">
        <BackButton onClick={onBack} />

        <div className="mb-7 text-center">
          <div
            className={cn(
              'mb-1.5 text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-white max-[420px]:text-[20px]',
              JAKARTA,
            )}
          >
            Đăng nhập bằng email
          </div>
          <div className="text-[13px] leading-[1.5] text-[var(--body)]">
            Nhập email và mật khẩu để tiếp tục.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4 text-left">
            <label htmlFor={emailId} className={LABEL_CLASS}>
              Email công việc
            </label>
            <div className="relative flex items-center">
              <input
                ref={emailInputRef}
                id={emailId}
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="ban@doanhnghiep.vn"
                autoComplete="email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? emailErrId : undefined}
                className={cn(INPUT_CLASS, INTER, emailError ? INPUT_ERROR_CLASS : undefined)}
              />
              <Mail aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
            </div>
            {touchedEmail && emailError ? (
              <p id={emailErrId} className={ERROR_CLASS}>
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="mb-4 text-left">
            <label htmlFor={pwId} className={LABEL_CLASS}>
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <input
                id={pwId}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                aria-invalid={pwError ? true : undefined}
                aria-describedby={pwError ? pwErrId : undefined}
                className={cn(INPUT_CLASS, INTER, 'pr-[70px]', pwError ? INPUT_ERROR_CLASS : undefined)}
              />
              <Lock aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
              <button
                type="button"
                onClick={() => setShowPw((prev) => !prev)}
                className={cn(
                  'absolute right-1.5 top-1/2 h-[38px] -translate-y-1/2 rounded-lg border-0 bg-transparent px-3 text-[12px] font-semibold text-white/55 [transition:color_.15s,background_.15s] hover:bg-white/6 hover:text-white',
                  INTER,
                )}
              >
                {showPw ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {touchedPw && pwError ? (
              <p id={pwErrId} className={ERROR_CLASS}>
                {pwError}
              </p>
            ) : null}
          </div>

          <div className="mt-1 mb-5 flex items-center justify-between text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-2 text-white/65 select-none">
              <input
                type="checkbox"
                defaultChecked
                className="h-[15px] w-[15px] cursor-pointer accent-[var(--accent)]"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <a href="#" className={LINK_CLASS}>
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            className={cn(
              'flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[15px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(232,93,38,.5)] [transition:background_.15s,transform_.1s,box-shadow_.2s] hover:-translate-y-px hover:bg-[#d04e1a] hover:shadow-[0_12px_28px_-6px_rgba(232,93,38,.6)] active:translate-y-0 active:scale-[.995]',
              JAKARTA,
            )}
          >
            <span>Đăng nhập</span>
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </form>

        <div className="mt-[22px] mb-[18px] flex items-center gap-[14px] text-[12px] text-white/35">
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
          hoặc
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          className={cn(
            'flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-[10px] rounded-xl border border-white/14 bg-white/5 text-sm font-medium text-white backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] [transition:background_.15s,border-color_.15s] hover:border-white/22 hover:bg-white/10 active:scale-[.995]',
            INTER,
          )}
        >
          <GoogleIcon size={18} />
          <span>Tiếp tục với Google</span>
        </button>

        <div className="mt-[22px] text-center text-[12.5px] leading-[1.6] text-white/50">
          Chưa có tài khoản?{' '}
          <a href="#" className={LINK_CLASS}>
            Tạo tài khoản mới
          </a>
        </div>
      </div>
    </div>
  )
}

export default EmailLoginForm
