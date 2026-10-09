import type { KeyboardEvent } from "react"

type ChatComposerProps = {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    isSending: boolean
}

export function ChatComposer({
    value,
    onChange,
    onSend,
    isSending,
    } : ChatComposerProps){
    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>){
        if(
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
        ) {
            event.preventDefault()
            if (value.trim() && !isSending){
                onSend()
            }
        }
    }

    return(
        <div className="flex items-end gap-2">
            <label htmlFor="ai-question" className="sr-only">
                Câu hỏi cho trợ lý AI
            </label>

            <textarea
            id="ai-question"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về Thuế TNDN..."
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-lg border border-border-control px-4 py-3"/>

            <button 
            type="button"
            disabled={!value.trim() || isSending}
            onClick={onSend}
            className="h-14 shrink-0 rounded-lg bg-accent px-5 text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
                {isSending ? 'Đang trả lời...' : 'Gửi'}
            </button>
        </div>
    )
}