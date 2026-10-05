import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BackButtonProps = {
  onClick: () => void
  ariaLabel?: string
  className?: string
}

export function BackButton({ onClick, ariaLabel = 'Quay lại', className }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'absolute top-4 left-4 h-9 w-9 grid place-items-center rounded-[10px] border border-white/10 bg-white/6 text-white transition hover:bg-white/12 hover:border-white/20 active:scale-95',
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export default BackButton
