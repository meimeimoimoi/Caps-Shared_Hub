import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { Input } from '@/components/ui/forms/input'
import { cn } from '@/lib/utils'
import type { Conversation } from '../types'

type ConversationHistoryProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  disabled: boolean
  onSelect: (id: string) => void
  onNewQuestion: () => void
  /** Ẩn tiêu đề khi đã có tiêu đề bên ngoài (ví dụ trong Drawer) */
  showTitle?: boolean
}

/* Lịch sử tra cứu: dùng chung cho cột trái (desktop) và Drawer (mobile). */
export function ConversationHistory({
  conversations,
  activeConversationId,
  disabled,
  onSelect,
  onNewQuestion,
  showTitle = true,
}: ConversationHistoryProps) {
  const { t } = useTranslation('aiAssistant')
  const [query, setQuery] = useState('')
  const searchId = useId()
  const headingId = useId()

  const normalized = query.trim().toLocaleLowerCase()
  const visible = normalized
    ? conversations.filter((item) =>
        item.title.toLocaleLowerCase().includes(normalized)
      )
    : conversations

  return (
    <nav aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-4 px-5 pt-6 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id={headingId}
            className={cn(
              'text-text-strong font-sans text-sm font-semibold',
              !showTitle && 'sr-only'
            )}
          >
            {t('history.title')}
          </h2>
          <span className="font-num text-text-muted text-caption">
            {t('history.count', { count: conversations.length })}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onNewQuestion}
          disabled={disabled}
          className="justify-start"
        >
          <Plus size={16} aria-hidden="true" />
          {t('history.newQuestion')}
        </Button>
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            {t('history.searchLabel')}
          </label>
          <Search
            size={15}
            aria-hidden="true"
            className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {visible.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {visible.map((conversation) => {
              const active = conversation.id === activeConversationId
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    disabled={disabled}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'motion-interactive focus-visible:ring-accent w-full rounded-md border-l-2 px-3 py-2.5 text-left text-sm leading-snug focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                      active
                        ? 'border-accent bg-accent-soft text-text-strong font-medium'
                        : 'text-text hover:bg-surface-muted hover:text-text-strong border-transparent'
                    )}
                  >
                    <span className="line-clamp-2">{conversation.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p role="status" className="text-text-muted px-3 py-2 text-sm">
            {normalized
              ? t('history.noMatch', { query: query.trim() })
              : t('history.empty')}
          </p>
        )}
      </div>
    </nav>
  )
}
