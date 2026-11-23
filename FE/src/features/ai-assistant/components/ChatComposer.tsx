import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, CircleAlert, Coins } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { mergeRefs } from '@/lib/merge-refs'
import { cn } from '@/lib/utils'

type ChatComposerProps = {
  ref?: Ref<HTMLTextAreaElement>
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  /** Translated validation or API error linked via aria-describedby */
  error?: string | null
  /** Centered empty-state composer; larger and displays the hint on mobile too */
  prominent?: boolean
  /** Caption below the input; defaults to keyboard shortcut hint */
  hint?: string
}

// Centered welcome composer can grow taller than the docked bottom composer.
const MAX_HEIGHT = { prominent: 320, docked: 200 }

/** Auto-resizing composer: Enter sends, Shift+Enter inserts a newline, IME composition is respected. */
export function ChatComposer({
  ref,
  value,
  onChange,
  onSend,
  isSending,
  error,
  prominent = false,
  hint,
}: ChatComposerProps) {
  const { t } = useTranslation('aiAssistant')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const canSend = value.trim().length > 0 && !isSending
  const [overflowing, setOverflowing] = useState(false)

  // Grow with content up to the cap; above the cap allow scrolling with edge fade masks.
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
          'bg-surface focus-within:border-border-control/60 flex border transition-[border-color,box-shadow] duration-200',
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
          ref={mergeRefs(textarea, ref)}
          rows={prominent ? 2 : 1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('composer.placeholder')}
          aria-describedby={cn(hintId, error && errorId)}
          aria-invalid={error ? true : undefined}
          className={cn(
            'text-text placeholder:text-text-muted/70 min-h-11 resize-none bg-transparent px-3 py-2.5 text-base leading-relaxed [overflow-wrap:anywhere] outline-none',
            // Stacked layout: flex-1 would shrink height to 0 and ignore auto-resize.
            prominent ? 'min-h-24 w-full flex-none' : 'flex-1',
            overflowing
              ? 'overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]'
              : 'overflow-y-hidden'
          )}
        />
        {/* Prominent layout keeps credit note and send button inside the rounded box. */}
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
