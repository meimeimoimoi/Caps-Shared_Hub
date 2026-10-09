import {
  forwardRef,
  useId,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { cn } from '@/lib/utils'

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  /** Thông báo lỗi đã dịch; gắn với ô nhập qua aria-describedby */
  error?: string | null
}

const MAX_HEIGHT = 200

/* Ô hỏi tự giãn: Enter gửi, Shift+Enter xuống dòng; không gửi khi đang gõ tiếng Việt (IME). */
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer({ value, onChange, onSend, isSending, error }, ref) {
    const { t } = useTranslation('aiAssistant')
    const textarea = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(ref, () => textarea.current as HTMLTextAreaElement)
    const inputId = useId()
    const hintId = useId()
    const errorId = useId()
    const canSend = value.trim().length > 0 && !isSending

    useLayoutEffect(() => {
      const element = textarea.current
      if (!element) return
      element.style.height = 'auto'
      element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`
    }, [value])

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault()
        if (canSend) onSend()
      }
    }

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSend) onSend()
        }}
        className="mx-auto flex w-full max-w-4xl flex-col gap-2"
      >
        {error && (
          <p
            id={errorId}
            role="alert"
            className="bg-danger-soft text-danger flex items-start gap-2 rounded-md px-3 py-2 text-sm"
          >
            <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        <div
          className={cn(
            'bg-surface border-border-control focus-within:border-accent focus-within:ring-accent/25 flex items-end gap-2 rounded-lg border p-2 shadow-sm transition-colors focus-within:ring-4',
            error && 'border-danger'
          )}
        >
          <label htmlFor={inputId} className="sr-only">
            {t('composer.label')}
          </label>
          <textarea
            id={inputId}
            ref={textarea}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('composer.placeholder')}
            aria-describedby={cn(hintId, error && errorId)}
            aria-invalid={error ? true : undefined}
            className="text-text placeholder:text-text-muted min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label={isSending ? t('composer.sending') : t('composer.send')}
            className="size-11 shrink-0 rounded-md"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </Button>
        </div>
        <p
          id={hintId}
          className="text-text-muted text-caption hidden px-1 md:block"
        >
          {t('composer.hint')}
        </p>
      </form>
    )
  }
)
