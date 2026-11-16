import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { listCaseMessagesForAdmin } from '../api/caseChatApi'
import { useCaseChat } from '../hooks/useCaseChat'
import { useCaseChatHub } from '../hooks/useCaseChatHub'
import { useCaseError } from '../hooks/useReviewCases'
import { fieldClass, useCaseFormat } from '../ui'
import type { CaseChatMessage } from '../types'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 4000

function MessageList({
  messages,
  mine,
}: {
  messages: CaseChatMessage[]
  mine?: CaseChatMessage['senderRole']
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  if (messages.length === 0)
    return <p className="text-fg-muted mt-3 text-sm">{t('live.chat.empty')}</p>
  return (
    <ol
      aria-live="polite"
      className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1"
    >
      {messages.map((m) => (
        <li
          key={m.id}
          className={cn(
            'rounded-surface max-w-[85%] p-3 text-sm',
            m.senderRole === mine ? 'bg-sunken ml-auto' : 'border-border border'
          )}
        >
          <p className="text-fg-muted text-caption num">
            {t(`live.chat.${m.senderRole}`)} · {f.at(m.createdAt)}
          </p>
          <p className="text-fg-strong mt-1 break-words whitespace-pre-wrap">
            {m.content}
          </p>
        </li>
      ))}
    </ol>
  )
}

/** The private conversation between the case's client and expert. */
export function CaseChat({
  caseId,
  role,
}: {
  caseId: string
  role: CaseChatMessage['senderRole']
}) {
  const { t } = useTranslation('reviewCase')
  const toMessage = useCaseError()
  const id = useId()
  const { messages, send, markRead } = useCaseChat(caseId)
  useCaseChatHub()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const list = messages.data ?? []
  const lastFromOther = list.findLast((m) => m.senderRole !== role)?.id
  const marked = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!lastFromOther || marked.current === lastFromOther) return
    marked.current = lastFromOther
    markRead.mutate(lastFromOther)
  }, [lastFromOther, markRead])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || send.isPending) return
    setError(null)
    send.mutate(content, {
      onSuccess: () => setText(''),
      onError: (err) => setError(toMessage(err)),
    })
  }

  return (
    <section className="paper p-6 md:p-8" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-h2 font-serif">
        {t(role === 'CLIENT' ? 'live.chat.title' : 'live.chat.titleExpert')}
      </h2>
      {messages.isError ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {toMessage(messages.error)}
        </p>
      ) : (
        <MessageList messages={list} mine={role} />
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label htmlFor={`${id}-text`} className="sr-only">
          {t('live.chat.label')}
        </label>
        <textarea
          id={`${id}-text`}
          rows={3}
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('live.chat.placeholder')}
          className={cn(fieldClass, 'resize-y')}
        />
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="btn btn-press btn-primary disabled:opacity-60"
        >
          {t('live.chat.send')}
        </button>
      </form>
    </section>
  )
}

/** The conversation as a system admin reads it to decide a dispute. */
export function AdminCaseChat({ caseId }: { caseId: string }) {
  const { t } = useTranslation('reviewCase')
  const toMessage = useCaseError()
  const messages = useQuery({
    queryKey: ['private', 'admin-case-messages', caseId],
    queryFn: ({ signal }) => listCaseMessagesForAdmin(caseId, signal),
  })
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('live.chat.titleAdmin')}</h2>
      {messages.isError ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {toMessage(messages.error)}
        </p>
      ) : (
        <MessageList messages={messages.data ?? []} />
      )}
    </section>
  )
}
