import { Fragment, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { MarginNote } from '@/components/ui/display/margin-note'
import { MotionReveal } from '@/components/ui/motion'
import type { ChatMessage } from '../types'

type TranscriptProps = {
  messages: ChatMessage[]
  isSending: boolean
  onCopy: (text: string) => void
}

const citationAnchor = (messageId: string, index: string | number) =>
  `${messageId}-cite-${index}`

/* Thay "[1]" trong câu trả lời bằng số trích dẫn bấm được, trỏ tới ghi chú lề. */
function AnswerText({ message }: { message: ChatMessage }) {
  const parts = message.content.split(/\[(\d+)\]/)
  const known = message.citations?.length ?? 0
  return (
    <p className="text-text text-doc text-pretty">
      {parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>
        const number = Number(part)
        if (number < 1 || number > known) return `[${part}]`
        return (
          <sup key={index} className="font-num ml-0.5">
            <a
              href={`#${citationAnchor(message.id, number)}`}
              className="text-accent-text focus-visible:ring-accent rounded-sm px-0.5 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {number}
            </a>
          </sup>
        )
      })}
    </p>
  )
}

function Question({ message }: { message: ChatMessage }) {
  const { t } = useTranslation('aiAssistant')
  return (
    <section className="flex flex-col gap-2">
      <p className="text-text-muted text-caption font-semibold tracking-[0.08em] uppercase">
        {t('transcript.question')}
      </p>
      <h2 className="text-text-strong font-serif text-xl leading-snug text-pretty md:text-2xl">
        {message.content}
      </h2>
    </section>
  )
}

function Answer({
  message,
  onCopy,
}: {
  message: ChatMessage
  onCopy: (text: string) => void
}) {
  const { t } = useTranslation('aiAssistant')
  const expertNoteId = useId()
  const citations = message.citations ?? []

  return (
    <article
      aria-label={t('transcript.answer')}
      className="paper flex flex-col gap-6 p-5 md:p-8"
    >
      <div className="doc-row">
        <div className="flex min-w-0 flex-col gap-4">
          <span className="badge-ai self-start">
            <Sparkles size={14} aria-hidden="true" />
            {t('transcript.aiBadge')}
          </span>
          <div className="para-ai">
            <AnswerText message={message} />
          </div>
        </div>

        <aside
          aria-label={t('transcript.citationsLabel')}
          className="border-border-subtle flex flex-col gap-4 border-t pt-4 lg:border-t-0 lg:pt-0"
        >
          {citations.length > 0 ? (
            citations.map((citation, index) => (
              <div
                key={citation.id}
                id={citationAnchor(message.id, index + 1)}
                className="scroll-mt-24"
              >
                <MarginNote
                  kind="cite"
                  label={t('transcript.citation', { index: index + 1 })}
                >
                  <span className="text-text-strong block font-medium">
                    {citation.source}
                  </span>
                  <span className="text-text-muted block">
                    {citation.excerpt}
                  </span>
                </MarginNote>
              </div>
            ))
          ) : (
            <MarginNote kind="ai" label={t('transcript.citationsLabel')}>
              {t('transcript.noCitations')}
            </MarginNote>
          )}
        </aside>
      </div>

      <footer className="border-border-subtle flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-text-muted text-sm text-pretty md:max-w-md">
          {t('transcript.disclaimer')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCopy(message.content)}
          >
            <Copy size={14} aria-hidden="true" />
            {t('transcript.copy')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            aria-describedby={expertNoteId}
          >
            <Send size={14} aria-hidden="true" />
            {t('transcript.sendToExpert')}
          </Button>
          <span id={expertNoteId} className="sr-only">
            {t('transcript.sendToExpertSoon')}
          </span>
        </div>
      </footer>
    </article>
  )
}

function Thinking() {
  const { t } = useTranslation('aiAssistant')
  return (
    <div role="status" className="paper flex flex-col gap-4 p-5 md:p-8">
      <span className="badge-ai self-start">
        <Sparkles size={14} aria-hidden="true" />
        {t('transcript.thinking')}
      </span>
      <div aria-hidden="true" className="para-ai flex flex-col gap-3">
        {['92%', '84%', '58%'].map((width) => (
          <span
            key={width}
            className="bg-sunken block h-3 rounded motion-safe:animate-pulse"
            style={{ width }}
          />
        ))}
      </div>
    </div>
  )
}

/* Bản ghi tra cứu: câu hỏi (serif) → câu trả lời dạng trang tài liệu có trích dẫn ở lề. */
export function Transcript({ messages, isSending, onCopy }: TranscriptProps) {
  const { t } = useTranslation('aiAssistant')
  return (
    <div
      aria-label={t('transcript.label')}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8 md:gap-10 md:py-12"
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
