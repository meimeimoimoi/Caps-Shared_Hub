type AssistantHeaderProps = {
    title: string
    onNewConversation: () => void
    isSending: boolean
    isHistoryOpen: boolean
    onToggleHistory: () => void
    isNavigationOpen: boolean
    onToggleNavigation: () => void          
}

export function AssistantHeader({
  title,
  onNewConversation,
  isSending,
  isHistoryOpen,
  onToggleHistory,
  isNavigationOpen,
  onToggleNavigation
}: AssistantHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
        <button
            type="button"
            onClick={onToggleNavigation}
            aria-expanded={isNavigationOpen}
            aria-controls="mobile-main-navigation"
            aria-label={isNavigationOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
            className="shrink-0 rounded-lg border border-border px-2 py-1.5 text-sm md:hidden"
            >
            Menu
        </button>
        <h1
            title={title}
            className="min-w-0 flex-1 truncate font-semibold"
        >
            {title}
        </h1>

        <button
            type="button"
            onClick={onNewConversation}
            disabled={isSending}
            className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
        >
            Mới
        </button>
        <button
            type="button"
            onClick={onToggleHistory}
            aria-expanded={isHistoryOpen}
            aria-controls="mobile-conversation-history"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm lg:hidden"
            >
            {isHistoryOpen ? 'Đóng' : 'Lịch sử'}
        </button>
    </header>
  )
}