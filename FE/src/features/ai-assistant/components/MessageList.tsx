import type { ChatMessage } from "../types";
import { useState } from 'react'

type MessageListProps = {
    messages: ChatMessage[]
    isSending: boolean
}

export function MessageList({ 
  messages,
  isSending,
 } : MessageListProps){
    const [copiedMessageId, setCopiedMessageId] =
      useState<string | null>(null)

    const [copyError, setCopyError] = useState<string | null>(null)

    async function handleCopy(message: ChatMessage) {
      setCopyError(null)
      setCopiedMessageId(null)

      try {
        await navigator.clipboard.writeText(message.content)
        setCopiedMessageId(message.id)
      } catch {
        setCopyError('Không thể sao chép. Bạn có thể chọn văn bản để sao chép thủ công.')
      }
    }
    return (
        <div className="flex flex-col gap-4" aria-live="polite">
          {messages.map((message) => (
            
        <div
          key={message.id}
          className={`max-w-[85%] rounded-xl px-4 py-3 ${
            message.role === 'user'
              ? 'self-end bg-sunken'
              : 'self-start border border-border bg-paper'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
          {message.role === 'assistant' && (
            <button
              type="button"
              onClick={() => handleCopy(message)}
              className="mt-2 rounded px-2 py-1 text-xs text-fg-muted hover:bg-sunken"
            >
              {copiedMessageId === message.id ? 'Đã sao chép' : 'Sao chép'}
            </button>
          )}
        </div>
      ))}
      {isSending && (
        <div
          role="status"
          className="self-start rounded-xl border border-border bg-paper px-4 py-3 text-sm text-fg-muted"
        >
          Đang trả lời…
        </div>
      )}
      {copyError && (
        <p role="alert" className="text-sm text-danger">
          {copyError}
        </p>
      )}
    </div>
    )
}