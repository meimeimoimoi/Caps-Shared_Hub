import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BackButtonProps = {
  onClick: () => void
  ariaLabel?: string
  className?: string
}

export function BackButton({ onClick, ariaLabel, className }: BackButtonProps) {
  const { t } = useTranslation('auth')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? t('actions.back')}
      className={cn(
        'absolute top-4 left-4 grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/6 text-white transition hover:border-white/20 hover:bg-white/12 active:scale-95',
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export default BackButton
