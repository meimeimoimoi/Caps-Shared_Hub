import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/forms/input'
import { cn } from '@/lib/utils'
import type { Conversation } from '../types'

type ConversationHistoryProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  disabled: boolean
  onSelect: (id: string) => void
}

/* Nội dung Drawer lịch sử: tìm kiếm → danh sách. "Câu hỏi mới" nằm ở footer của Drawer. */
export function ConversationHistory({
  conversations,
  activeConversationId,
  disabled,
  onSelect,
}: ConversationHistoryProps) {
  const { t } = useTranslation('aiAssistant')
  const [query, setQuery] = useState('')
  const searchId = useId()
  const listLabelId = useId()
  const searchInput = useRef<HTMLInputElement>(null)

  // Drawer gọi showModal() sau khi con mount và đưa focus về nút đóng;
  // chờ một frame rồi đưa focus vào ô tìm kiếm, nơi người dùng cần gõ.
  useEffect(() => {
    const frame = requestAnimationFrame(() => searchInput.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  const normalized = query.trim().toLocaleLowerCase()
  const visible = normalized
    ? conversations.filter((item) =>
        item.title.toLocaleLowerCase().includes(normalized)
      )
    : conversations

  return (
    <div className="flex flex-col gap-5">
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
          ref={searchInput}
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="h-10 pl-9"
        />
      </div>

      <section aria-labelledby={listLabelId} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h3
            id={listLabelId}
            className="text-text-muted text-caption font-sans font-semibold tracking-[0.08em] uppercase"
          >
            {t('history.listLabel')}
          </h3>
          <span className="font-num text-text-muted text-caption tabular-nums">
            {normalized
              ? `${visible.length}/${conversations.length}`
              : conversations.length}
          </span>
        </div>

        {visible.length > 0 ? (
          <ul className="-mx-2 flex flex-col">
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
                      'motion-interactive focus-visible:ring-accent relative w-full rounded-md px-3 py-2.5 text-left text-sm leading-snug focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                      active
                        ? 'bg-surface-muted text-text-strong before:bg-accent font-medium before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full'
                        : 'text-text hover:bg-surface-muted hover:text-text-strong'
                    )}
                  >
                    <span className="line-clamp-2">{conversation.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p role="status" className="text-text-muted px-1 py-2 text-sm">
            {normalized
              ? t('history.noMatch', { query: query.trim() })
              : t('history.empty')}
          </p>
        )}
      </section>
    </div>
  )
}
