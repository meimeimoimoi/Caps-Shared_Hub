import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  History,
  MessageSquareText,
  PanelLeftClose,
  Plus,
  Search,
} from 'lucide-react'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import type { Conversation } from '../types'

type ConversationHistoryProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  disabled: boolean
  onSelect: (id: string) => void
  onNewQuestion: () => void
  /** Có thì hiện nút thu gọn cột (desktop) */
  onCollapse?: () => void
  /** Ngăn kéo mobile: đưa focus vào ô tìm khi mở */
  autoFocusSearch?: boolean
}

const DAY = 24 * 60 * 60 * 1000
const GROUPS = ['today', 'week', 'older'] as const
type Group = (typeof GROUPS)[number]

/* Nhóm theo mốc ngày lịch (giờ máy người dùng), không theo 24 giờ trôi qua */
function groupOf(updatedAt: string, now: Date): Group {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const time = new Date(updatedAt).getTime()
  if (time >= startOfToday) return 'today'
  if (time >= startOfToday - 6 * DAY) return 'week'
  return 'older'
}

/* Cột lịch sử tra cứu: Câu hỏi mới → tìm kiếm → danh sách nhóm theo thời gian */
export function ConversationHistory({
  conversations,
  activeConversationId,
  disabled,
  onSelect,
  onNewQuestion,
  onCollapse,
  autoFocusSearch = false,
}: ConversationHistoryProps) {
  const { t } = useTranslation('aiAssistant')
  const format = useFormatters()
  // Giờ hiển thị theo máy người dùng, khớp với cách nhóm Hôm nay / 7 ngày qua
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [query, setQuery] = useState('')
  const searchId = useId()
  const searchInput = useRef<HTMLInputElement>(null)

  // Drawer gọi showModal() sau khi con mount và đưa focus về nút đóng;
  // chờ một frame rồi đưa focus vào ô tìm kiếm, nơi người dùng cần gõ.
  useEffect(() => {
    if (!autoFocusSearch) return
    const frame = requestAnimationFrame(() => searchInput.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [autoFocusSearch])

  const normalized = query.trim().toLocaleLowerCase()
  const visible = normalized
    ? conversations.filter((item) =>
        item.title.toLocaleLowerCase().includes(normalized)
      )
    : conversations
  const now = new Date()
  const grouped = GROUPS.map((group) => ({
    group,
    items: visible.filter((item) => groupOf(item.updatedAt, now) === group),
  })).filter(({ items }) => items.length > 0)

  // Hôm nay: giờ; ngày khác: dd/MM (không dùng gạch ngang dễ nhầm với khoảng)
  const stamp = (iso: string, group: Group) => {
    if (group === 'today')
      return format.timestamp(iso, timeZone, {
        hour: '2-digit',
        minute: '2-digit',
      })
    const date = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
  }

  /* Mọi hàng dùng chung lề trong px-3 để tiêu đề, nút, ô tìm và danh sách thẳng một mép */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 items-center justify-between gap-2 pl-3">
        <h2 className="text-text-strong flex items-center gap-2 font-sans text-sm font-semibold">
          <History size={16} aria-hidden="true" className="text-accent-text" />
          {t('history.title')}
        </h2>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={t('history.collapse')}
            title={t('history.collapse')}
            className="motion-interactive text-text-muted hover:bg-surface hover:text-text-strong focus-visible:ring-accent flex size-8 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onNewQuestion}
          disabled={disabled}
          className="group motion-interactive bg-surface border-border text-text-strong hover:border-border-strong focus-visible:ring-accent flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <Plus
            size={16}
            aria-hidden="true"
            className="text-accent-text transition-transform duration-200 group-hover:rotate-90"
          />
          {t('history.newQuestion')}
        </button>

        <label
          htmlFor={searchId}
          className="bg-surface/60 border-border/70 focus-within:border-border-control/60 focus-within:bg-surface flex h-9 items-center gap-2 rounded-lg border px-3 transition-[border-color,background-color]"
        >
          <Search
            size={15}
            aria-hidden="true"
            className="text-text-muted shrink-0"
          />
          <span className="sr-only">{t('history.searchLabel')}</span>
          <input
            ref={searchInput}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="text-text-strong placeholder:text-text-muted w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <nav
        aria-label={t('history.title')}
        className="mt-4 min-h-0 flex-1 overflow-y-auto pb-3"
      >
        {grouped.length > 0 ? (
          grouped.map(({ group, items }) => (
            <section key={group} className="mt-4 first:mt-0">
              <h3 className="text-text-muted px-3 pb-1 font-sans text-xs font-semibold">
                {t(`history.groups.${group}`)}
              </h3>
              <MotionStagger className="flex flex-col gap-px">
                {items.map((conversation) => {
                  const active = conversation.id === activeConversationId
                  return (
                    <MotionReveal key={conversation.id} preset="reveal">
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        disabled={disabled}
                        aria-current={active ? 'page' : undefined}
                        title={conversation.title}
                        className={cn(
                          'group motion-interactive focus-visible:ring-accent flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                          active
                            ? 'bg-surface text-text-strong font-semibold shadow-xs'
                            : 'text-text-strong hover:bg-surface hover:shadow-xs'
                        )}
                      >
                        <MessageSquareText
                          size={15}
                          aria-hidden="true"
                          className={cn(
                            'shrink-0 transition-colors',
                            active
                              ? 'text-accent-text'
                              : 'text-text-muted group-hover:text-accent-text'
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate transition-transform duration-200 group-hover:translate-x-0.5">
                          {conversation.title}
                        </span>
                        <time
                          dateTime={conversation.updatedAt}
                          className="font-num text-text-muted shrink-0 text-xs tabular-nums"
                        >
                          {stamp(conversation.updatedAt, group)}
                        </time>
                      </button>
                    </MotionReveal>
                  )
                })}
              </MotionStagger>
            </section>
          ))
        ) : (
          <p role="status" className="text-text-muted px-3 py-2 text-sm">
            {normalized
              ? t('history.noMatch', { query: query.trim() })
              : t('history.empty')}
          </p>
        )}
      </nav>
    </div>
  )
}
