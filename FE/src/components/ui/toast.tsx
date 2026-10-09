import { useEffect } from 'react'
import { Check } from 'lucide-react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

/* Một toast tại một thời điểm; tự ẩn sau `duration` ms */
export function Toast({ message, onDone, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [message, onDone, duration])

  return (
    <div
      role="status"
      className="bg-ink text-paper rounded-overlay shadow-overlay fixed right-4 bottom-4 z-40 flex items-center gap-2 px-4 py-3 text-sm font-semibold md:right-6 md:bottom-6"
    >
      <Check size={16} aria-hidden="true" />
      {message}
    </div>
  )
}
