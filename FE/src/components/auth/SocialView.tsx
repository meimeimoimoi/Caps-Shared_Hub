import { Mail } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { GoogleIcon } from './GoogleIcon'

export type SocialViewProps = {
  onContinueEmail: () => void
  onGoogle: () => void
  className?: string
}

const BRAND_FONT = "[font-family:'Plus_Jakarta_Sans',sans-serif]"

const BTN =
  'w-full min-h-[56px] border-0 rounded-[14px] bg-[var(--btn)] text-[var(--btn-ink)] text-[15px] font-medium flex items-center gap-[14px] px-5 cursor-pointer text-left [font-family:Inter,sans-serif] [transition:background_.15s,transform_.1s,box-shadow_.2s] hover:bg-[var(--btn-hover)] hover:shadow-[0_6px_20px_-6px_rgba(255,255,255,.15)] active:scale-[.995] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)] max-[420px]:min-h-[52px] max-[420px]:px-4'

const TERMS_LINK =
  'text-[var(--link)] font-medium no-underline transition-opacity underline-offset-2 hover:underline hover:opacity-80'

export function SocialView({ onContinueEmail, onGoogle, className }: SocialViewProps) {
  return (
    <div
      className={cn(
        'relative z-1 w-full max-w-[480px] flex flex-col items-center text-center [transition:opacity_.35s_ease,transform_.35s_ease]',
        className,
      )}
    >
      <h1
        className={cn(
          'text-[28px] font-bold leading-[1.2] tracking-[-0.03em] mb-2 text-white [text-shadow:0_2px_12px_rgba(0,0,0,.6)] max-[420px]:text-[24px]',
          BRAND_FONT,
        )}
      >
        Đăng nhập vào SHFT
      </h1>
      <p className="text-sm text-[var(--body)] mb-8 [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">
        Tiếp tục quản lý hồ sơ thuế của bạn.
      </p>

      <div className="w-full flex flex-col gap-3 mb-6">
        <button type="button" onClick={onGoogle} className={BTN}>
          <span className="flex-none grid h-[22px] w-[22px] place-items-center">
            <GoogleIcon size={20} />
          </span>
          <span className="flex-1 flex flex-col leading-[1.25] min-w-0">
            <span className="text-[15px] font-medium text-[var(--btn-ink)]">
              Continue with Google
            </span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4 w-full mt-1 mb-5 text-[13px] text-[var(--muted)]">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
        or
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <button type="button" onClick={onContinueEmail} className={BTN}>
        <span className="flex-none grid h-[22px] w-[22px] place-items-center">
          <Mail size={22} aria-hidden="true" />
        </span>
        <span className="flex-1 flex flex-col leading-[1.25] min-w-0">
          <span className="text-[15px] font-medium text-[var(--btn-ink)]">Continue with email</span>
        </span>
      </button>

      <p className="mt-8 text-[12.5px] leading-[1.6] text-[var(--body)] max-w-[440px] [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">
        By continuing with Google, or Email, you agree to our{' '}
        <a href="#" className={TERMS_LINK}>
          Terms of Service
        </a>{' '}
        and acknowledge that you have read and understand our{' '}
        <a href="#" className={TERMS_LINK}>
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}

export default SocialView
