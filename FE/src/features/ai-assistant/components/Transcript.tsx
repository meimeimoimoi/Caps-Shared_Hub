import { Fragment, useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Copy,
  FileText,
  Info,
  Send,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'
import type { ChatMessage } from '../types'

type TranscriptProps = {
  messages: ChatMessage[]
  isSending: boolean
  onCopy: (text: string) => void
}

const citationAnchor = (messageId: string, index: string | number) =>
  `${messageId}-cite-${index}`

/* Thay "[1]" trong câu trả lời bằng số trích dẫn bấm được, trỏ tới thẻ căn cứ bên dưới. */
function AnswerText({ message }: { message: ChatMessage }) {
  const parts = message.content.split(/\[(\d+)\]/)
  const known = message.citations?.length ?? 0
  return (
    <p className="text-text-strong text-[0.9375rem] leading-7 text-pretty">
      {parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>
        const number = Number(part)
        if (number < 1 || number > known) return `[${part}]`
        return (
          <a
            key={index}
            href={`#${citationAnchor(message.id, number)}`}
            className="font-num text-accent-text hover:bg-accent-soft focus-visible:ring-accent ml-0.5 rounded px-0.5 align-super text-[0.6875rem] leading-none font-semibold no-underline transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            [{number}]
          </a>
        )
      })}
    </p>
  )
}

/* Câu hỏi: bong bóng bên phải, cùng kiểu khung bo tròn của ô hỏi */
function Question({ message }: { message: ChatMessage }) {
  const { t } = useTranslation('aiAssistant')
  return (
    <section aria-label={t('transcript.question')} className="flex justify-end">
      <p className="bg-surface border-border text-text-strong max-w-[85%] rounded-2xl rounded-br-md border px-4 py-3 text-base leading-relaxed text-pretty [overflow-wrap:anywhere] shadow-xs">
        {message.content}
      </p>
    </section>
  )
}

/* Câu trả lời trình bày như một văn bản tra cứu: đầu khung (người trả lời + mức đối chiếu)
   → nội dung → nguồn tham chiếu dạng danh sách liền khối → chân khung (lưu ý + thao tác). */
function Answer({
  message,
  onCopy,
}: {
  message: ChatMessage
  onCopy: (text: string) => void
}) {
  const { t } = useTranslation('aiAssistant')
  const expertNoteId = useId()
  const sourcesTitleId = useId()
  const citations = message.citations ?? []
  const grounded = citations.length > 0

  return (
    <article aria-label={t('transcript.answer')} className="flex">
      <div className="bg-surface border-border min-w-0 flex-1 overflow-hidden rounded-2xl border shadow-xs">
        <header className="border-border-subtle flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <span className="text-text-strong text-sm font-semibold">
            {t('transcript.assistantName')}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
              grounded
                ? 'bg-success-soft text-success'
                : 'bg-warning-soft text-warning'
            )}
          >
            {grounded ? (
              <BadgeCheck size={13} aria-hidden="true" />
            ) : (
              <TriangleAlert size={13} aria-hidden="true" />
            )}
            {grounded
              ? t('transcript.verified', { count: citations.length })
              : t('transcript.unverified')}
          </span>
        </header>

        <div className="flex flex-col gap-5 px-5 py-4">
          <AnswerText message={message} />

          {grounded ? (
            <section
              aria-labelledby={sourcesTitleId}
              className="flex flex-col gap-2"
            >
              <h3
                id={sourcesTitleId}
                className="text-text-muted text-xs font-semibold tracking-[0.06em] uppercase"
              >
                {t('transcript.sources')}
              </h3>
              <MotionStagger className="border-border divide-border-subtle flex flex-col divide-y overflow-hidden rounded-xl border">
                {citations.map((citation, index) => (
                  <MotionReveal key={citation.id} preset="reveal">
                    <div
                      id={citationAnchor(message.id, index + 1)}
                      className="target:bg-accent-soft/60 flex scroll-mt-24 gap-3 px-3.5 py-3 transition-colors duration-500"
                    >
                      <span className="font-num text-accent-text w-6 shrink-0 pt-px text-xs font-semibold">
                        [{index + 1}]
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-text-strong flex items-center gap-1.5 text-sm leading-snug font-semibold">
                          <FileText
                            size={14}
                            aria-hidden="true"
                            className="text-text-muted shrink-0"
                          />
                          {citation.source}
                        </span>
                        <blockquote className="border-border text-text-muted line-clamp-3 border-l-2 pl-2.5 text-sm leading-snug">
                          {citation.excerpt}
                        </blockquote>
                      </div>
                    </div>
                  </MotionReveal>
                ))}
              </MotionStagger>
            </section>
          ) : (
            <p
              role="note"
              className="bg-warning-soft text-warning flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
            >
              <TriangleAlert
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              {t('transcript.noCitations')}
            </p>
          )}
        </div>

        <footer className="border-border-subtle bg-sunken/50 flex flex-col gap-2 border-t px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text-muted flex items-start gap-1.5 text-xs leading-relaxed text-pretty sm:max-w-md">
            <Info size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
            {t('transcript.disclaimer')}
          </p>
          <div className="-mx-2 flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onCopy(message.content)}
              className="motion-interactive text-text-muted hover:bg-surface hover:text-text-strong focus-visible:ring-accent inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              <Copy size={14} aria-hidden="true" />
              {t('transcript.copy')}
            </button>
            <button
              type="button"
              disabled
              aria-describedby={expertNoteId}
              title={t('transcript.sendToExpertSoon')}
              className="text-text-muted inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg px-2 text-xs font-medium opacity-60"
            >
              <Send size={14} aria-hidden="true" />
              {t('transcript.sendToExpert')}
            </button>
            <span id={expertNoteId} className="sr-only">
              {t('transcript.sendToExpertSoon')}
            </span>
          </div>
        </footer>
      </div>
    </article>
  )
}

function Thinking() {
  const { t } = useTranslation('aiAssistant')
  return (
    <div role="status" className="flex">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-text-muted text-xs font-semibold">
          {t('transcript.thinking')}
        </p>
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          {['92%', '84%', '58%'].map((width) => (
            <span
              key={width}
              className="bg-sunken block h-3 rounded-full motion-safe:animate-pulse"
              style={{ width }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* Bản ghi tra cứu: câu hỏi (bong bóng phải) → câu trả lời có thẻ căn cứ đánh số bên dưới. */
export function Transcript({ messages, isSending, onCopy }: TranscriptProps) {
  const { t } = useTranslation('aiAssistant')
  return (
    <div
      aria-label={t('transcript.label')}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8 md:gap-10 md:py-10"
    >
      {messages.map((message) => (
        <MotionReveal key={message.id} preset="reveal">
          {message.role === 'user' ? (
            <Question message={message} />
          ) : (
            <Answer message={message} onCopy={onCopy} />
          )}
        </MotionReveal>
      ))}
      {isSending && (
        <MotionReveal preset="fade">
          <Thinking />
        </MotionReveal>
      )}
    </div>
  )
}
