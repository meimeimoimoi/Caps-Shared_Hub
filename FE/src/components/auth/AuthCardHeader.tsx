import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

export type AuthCardHeaderProps = {
  title: string
  description: string
  onBack: () => void
}

/* Header chung cho các bước trong thẻ đăng nhập: liên kết "Quay lại" nhỏ ở trên,
 * tiêu đề và mô tả căn giữa thẻ. */
export function AuthCardHeader({ title, description, onBack }: AuthCardHeaderProps) {
  const { t } = useTranslation('auth')

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={onBack}
        className="group -ml-1 mb-4 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] font-medium text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <ArrowLeft
          aria-hidden="true"
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        {t('actions.back')}
      </button>
      <h1 className="mb-1.5 text-center font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.025em] text-white max-[420px]:text-[20px]">
        {title}
      </h1>
      <p className="text-center text-[13.5px] leading-[1.5] text-[var(--body)]">
        {description}
      </p>
    </div>
  )
}

export default AuthCardHeader
