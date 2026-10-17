import {
  forwardRef,
  useId,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, CircleAlert, Coins } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { cn } from '@/lib/utils'

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  /** Thông báo lỗi đã dịch; gắn với ô nhập qua aria-describedby */
  error?: string | null
  /** Ô hỏi ở giữa màn hình trống: to hơn, hiện gợi ý cả trên mobile */
  prominent?: boolean
  /** Dòng chú thích dưới ô hỏi; mặc định là phím tắt */
  hint?: string
}

// Ô giữa trang được giãn cao hơn ô ghim ở đáy (đáy cần chừa chỗ cho câu trả lời)
const MAX_HEIGHT = { prominent: 320, docked: 200 }

/* Ô hỏi tự giãn: Enter gửi, Shift+Enter xuống dòng; không gửi khi đang gõ tiếng Việt (IME). */
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer(
    { value, onChange, onSend, isSending, error, prominent = false, hint },
    ref
  ) {
    const { t } = useTranslation('aiAssistant')
    const textarea = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(ref, () => textarea.current as HTMLTextAreaElement)
    const inputId = useId()
    const hintId = useId()
    const errorId = useId()
    const canSend = value.trim().length > 0 && !isSending
    const [overflowing, setOverflowing] = useState(false)

    // Giãn theo nội dung tới mức trần; quá trần mới cho cuộn và làm mờ hai mép để báo còn chữ
    useLayoutEffect(() => {
      const element = textarea.current
      if (!element) return
      const max = prominent ? MAX_HEIGHT.prominent : MAX_HEIGHT.docked
      element.style.height = 'auto'
      element.style.height = `${Math.min(element.scrollHeight, max)}px`
      setOverflowing(element.scrollHeight > max)
    }, [value, prominent])

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
        className="mx-auto flex w-full max-w-3xl flex-col gap-2"
      >
        {error && (
          <p
            id={errorId}
            role="alert"
            className="bg-danger-soft text-danger flex items-start gap-2 rounded-md px-3 py-2 text-sm"
          >
            <CircleAlert
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            {error}
          </p>
        )}
        <div
          className={cn(
            // Focus: viền xám vừa + bóng sâu hơn, không dùng vòng cam (đồng bộ ô tìm kiếm header)
            'bg-surface focus-within:border-border-control/60 flex border transition-[border-color,box-shadow] duration-200',
            // Hai biến thể cùng một họ: viền nhạt, bo 2xl, bóng mềm; ô giữa trang chỉ cao hơn
            'border-border rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)] focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-14px_rgb(0_0_0/0.26)]',
            prominent ? 'flex-col p-2' : 'items-end gap-2 p-1.5',
            error && 'border-danger'
          )}
        >
          <label htmlFor={inputId} className="sr-only">
            {t('composer.label')}
          </label>
          <textarea
            id={inputId}
            ref={textarea}
            rows={prominent ? 2 : 1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('composer.placeholder')}
            aria-describedby={cn(hintId, error && errorId)}
            aria-invalid={error ? true : undefined}
            className={cn(
              'text-text placeholder:text-text-muted/70 min-h-11 resize-none bg-transparent px-3 py-2.5 text-base leading-relaxed [overflow-wrap:anywhere] outline-none',
              // Khung xếp dọc: flex-1 sẽ ép chiều cao về 0 và bỏ qua chiều cao tự giãn
              prominent ? 'min-h-16 w-full flex-none' : 'flex-1',
              overflowing
                ? 'overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]'
                : 'overflow-y-hidden'
            )}
          />
          {/* Ô nổi bật: chú thích Credit và nút gửi nằm trong khung, không lơ lửng bên ngoài */}
          <div
            className={cn(
              'flex items-center gap-3',
              prominent ? 'justify-between pl-3' : 'shrink-0'
            )}
          >
            {prominent && (
              <p
                id={hintId}
                className="text-text-muted text-caption flex min-w-0 items-center gap-1.5"
              >
                <Coins size={14} aria-hidden="true" className="shrink-0" />
                {hint ?? t('composer.hint')}
              </p>
            )}
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label={
                isSending ? t('composer.sending') : t('composer.send')
              }
              className={cn(
                'disabled:text-text-muted shrink-0 disabled:opacity-100 disabled:shadow-none',
                'disabled:border-border size-10 rounded-full disabled:border disabled:bg-transparent'
              )}
            >
              <ArrowUp size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
        {!prominent && (
          <p
            id={hintId}
            className="text-text-muted text-caption hidden px-1 md:block"
          >
            {hint ?? t('composer.hint')}
          </p>
        )}
      </form>
    )
  }
)
