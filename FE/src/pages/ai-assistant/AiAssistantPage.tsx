import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LogIn, PanelLeftOpen, SquarePen } from 'lucide-react'
import { Drawer } from '@/components/ui/feedback/drawer'
import { Toast } from '@/components/ui/feedback/toast'
import { AppHeader } from '@/components/ui/layout/app-header'
import { AppSidebar } from '@/components/ui/layout/app-sidebar'
import { cn } from '@/lib/utils'
import { useUserNavigation } from '@/app/layouts/user/useUserNavigation'
import {
  MotionReveal,
  useDialogMotion,
  useReducedMotion,
} from '@/components/ui/motion'
import { useAuthStore } from '@/features/auth/store/authStore'
import { AssistantWelcome } from '@/features/ai-assistant/components/AssistantWelcome'
import { ChatComposer } from '@/features/ai-assistant/components/ChatComposer'
import { ConversationHistory } from '@/features/ai-assistant/components/ConversationHistory'
import { Transcript } from '@/features/ai-assistant/components/Transcript'
import { useAiAssistant } from '@/features/ai-assistant/hooks/useAiAssistant'

export default function AiAssistantPage() {
  const { t } = useTranslation(['aiAssistant', 'common', 'navigation'])
  const {
    question,
    setQuestion,
    messages,
    conversationTitle,
    handleSend,
    handleNewConversation,
    isSending,
    error,
    conversations,
    handleSelectConversation,
    activeConversationId,
  } = useAiAssistant()

  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const reducedMotion = useReducedMotion()

  // Trang này có cột lịch sử riêng nên menu chính mặc định thu thành dải icon (kiểu Slack/Linear)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Desktop (lg+): cột lịch sử cố định, thu gọn được; dưới lg dùng ngăn kéo
  const [historyPanel, setHistoryPanel] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const navDrawer = useRef<HTMLDialogElement>(null)
  const navTrigger = useRef<HTMLButtonElement>(null)
  const historyTrigger = useRef<HTMLButtonElement>(null)
  const focusTriggerOnCollapse = useRef(false)
  const composer = useRef<HTMLTextAreaElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  useDialogMotion(navDrawer, 'drawer-left')

  useEffect(() => {
    document.title = `${t('aiAssistant:pageTitle')} | Shared Hub`
  }, [t])

  // Giữ câu trả lời mới nhất trong tầm nhìn; không cuộn mượt khi người dùng giảm chuyển động
  useEffect(() => {
    const area = scrollArea.current
    if (!area) return
    area.scrollTo({
      top: area.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [messages, isSending, reducedMotion])

  const groups = useUserNavigation('ai-assistant')

  const closeNavDrawer = () => navDrawer.current?.close()

  function focusComposer() {
    requestAnimationFrame(() => composer.current?.focus())
  }

  function selectQuestion(text: string) {
    setQuestion(text)
    focusComposer()
  }

  function startNewQuestion() {
    handleNewConversation()
    setHistoryOpen(false)
    focusComposer()
  }

  function selectConversation(id: string) {
    handleSelectConversation(id)
    setHistoryOpen(false)
  }

  async function copyAnswer(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setToast(t('aiAssistant:transcript.copied'))
    } catch {
      setToast(t('aiAssistant:transcript.copyFailed'))
    }
  }

  const isEmpty = messages.length === 0 && !isSending
  const composerProps = {
    ref: composer,
    value: question,
    onChange: setQuestion,
    onSend: handleSend,
    isSending,
    error: error ? t(`aiAssistant:${error}`) : null,
  }

  function collapseHistory() {
    setHistoryPanel(false)
    focusTriggerOnCollapse.current = true
  }

  // Cột vừa thu gọn thành inert: sau khi nút mở lại đã render thì chuyển focus sang đó
  useEffect(() => {
    if (historyPanel || !focusTriggerOnCollapse.current) return
    focusTriggerOnCollapse.current = false
    historyTrigger.current?.focus()
  }, [historyPanel])

  function openHistory() {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setHistoryPanel(true)
      return
    }
    setHistoryOpen(true)
  }

  return (
    <div className="bg-canvas text-text flex h-dvh overflow-hidden">
      <a
        href="#assistant-main"
        className="focus:bg-surface sr-only z-50 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
      >
        {t('aiAssistant:skipToConversation')}
      </a>

      {/* Điều hướng ứng dụng (desktop) */}
      <aside
        className={`sidebar-rail bg-sidebar border-sidebar hidden shrink-0 flex-col border-r py-6 md:flex ${sidebarExpanded ? 'w-60 px-4' : 'w-20 px-3'}`}
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('aiAssistant:workspaceNavigation')}
          collapsed={!sidebarExpanded}
          onToggleCollapse={() => setSidebarExpanded((value) => !value)}
        />
      </aside>

      {/* Điều hướng ứng dụng (mobile) */}
      <dialog
        ref={navDrawer}
        aria-label={t('aiAssistant:workspaceNavigation')}
        onClose={() => navTrigger.current?.focus()}
        className="bg-sidebar fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-32px)] border-0 px-4 py-6 text-white backdrop:bg-black/50 [&[open]]:flex [&[open]]:flex-col"
      >
        <AppSidebar
          groups={groups}
          navigationLabel={t('aiAssistant:workspaceNavigation')}
          onNavigate={closeNavDrawer}
          onClose={closeNavDrawer}
        />
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          navigationButtonRef={navTrigger}
          onOpenNavigation={() => navDrawer.current?.showModal()}
          context={
            <span
              aria-current="page"
              className="text-text-strong block max-w-[50vw] truncate font-semibold md:max-w-md"
            >
              {conversationTitle ?? t('aiAssistant:pageTitle')}
            </span>
          }
          searchLinks={groups.flatMap((group) =>
            group.items.flatMap((item) =>
              item.to ? [{ label: item.label, to: item.to }] : []
            )
          )}
          account={{
            name: user?.name ?? t('common:account.preview'),
            onSignOut: user
              ? () => {
                  clearSession()
                  navigate('/login')
                }
              : undefined,
            links: user
              ? []
              : [
                  {
                    label: t('common:actions.signIn'),
                    to: '/login',
                    icon: <LogIn size={17} />,
                  },
                ],
          }}
        />

        <div className="flex min-h-0 flex-1">
          {/* Cột lịch sử luôn gắn trong DOM để co/giãn chiều rộng mượt; khi thu gọn thì inert */}
          <aside
            id="assistant-history"
            inert={!historyPanel}
            aria-hidden={!historyPanel}
            className={cn(
              'bg-sunken hidden min-w-0 shrink-0 overflow-hidden border-r transition-[width,border-color] duration-300 ease-[var(--motion-ease-enter)] motion-reduce:transition-none lg:flex',
              historyPanel ? 'border-border w-72' : 'w-0 border-r-0'
            )}
          >
            <div
              className={cn(
                'flex w-72 shrink-0 flex-col px-3 pt-3 transition-[opacity,translate] duration-300 ease-[var(--motion-ease-enter)] motion-reduce:transition-none',
                historyPanel
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-4 opacity-0'
              )}
            >
              <ConversationHistory
                conversations={conversations}
                activeConversationId={activeConversationId}
                disabled={isSending}
                onSelect={selectConversation}
                onNewQuestion={startNewQuestion}
                onCollapse={collapseHistory}
              />
            </div>
          </aside>
          <main
            id="assistant-main"
            tabIndex={-1}
            className="relative flex min-w-0 flex-1 flex-col focus:outline-none"
          >
            {/* Cụm thao tác khi cột lịch sử đóng: mở lịch sử + câu hỏi mới, gom ở góc trái
                đúng chỗ cột thu vào. Desktop: nổi đè lên nội dung, không chiếm hàng riêng.
                Desktop khi cột mở thì ẩn vì cột đã có cả hai nút. */}
            {(!isEmpty || !historyPanel) && (
              <div
                className={cn(
                  'px-4 pt-3 md:px-5',
                  historyPanel && 'lg:hidden',
                  'lg:pointer-events-none lg:absolute lg:top-0 lg:left-0 lg:z-10'
                )}
              >
                <MotionReveal
                  preset="reveal"
                  replayKey={String(historyPanel)}
                  className="bg-surface/90 border-border pointer-events-auto inline-flex items-center gap-0.5 rounded-xl border p-1 shadow-xs backdrop-blur"
                >
                  <button
                    ref={historyTrigger}
                    type="button"
                    onClick={openHistory}
                    aria-controls="assistant-history"
                    aria-expanded={historyPanel}
                    aria-label={t('aiAssistant:history.open')}
                    title={t('aiAssistant:history.open')}
                    className="group motion-interactive text-text-muted hover:bg-sunken hover:text-text-strong focus-visible:ring-accent flex size-8 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <PanelLeftOpen
                      size={17}
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </button>
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={startNewQuestion}
                      disabled={isSending}
                      aria-label={t('aiAssistant:history.newQuestion')}
                      title={t('aiAssistant:history.newQuestion')}
                      className="group motion-interactive text-text-muted hover:bg-sunken hover:text-text-strong focus-visible:ring-accent flex size-8 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      <SquarePen
                        size={16}
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:-rotate-6"
                      />
                    </button>
                  )}
                </MotionReveal>
              </div>
            )}

            <div
              ref={scrollArea}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-10"
            >
              {isEmpty ? (
                <AssistantWelcome
                  composer={
                    <ChatComposer
                      {...composerProps}
                      prominent
                      hint={t('aiAssistant:welcome.creditNote')}
                    />
                  }
                  onSelectQuestion={selectQuestion}
                />
              ) : (
                <Transcript
                  messages={messages}
                  isSending={isSending}
                  onCopy={copyAnswer}
                />
              )}
            </div>

            {/* Đã có hội thoại: ô hỏi ghim ở đáy; tôn trọng vùng an toàn trên điện thoại */}
            {!isEmpty && (
              <div className="bg-canvas before:from-canvas relative px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-linear-to-t before:to-transparent md:px-10 md:pb-5">
                <ChatComposer {...composerProps} />
              </div>
            )}
          </main>
        </div>
      </div>

      {historyOpen && (
        <Drawer
          title={t('aiAssistant:history.title')}
          onClose={() => {
            setHistoryOpen(false)
            historyTrigger.current?.focus()
          }}
        >
          <ConversationHistory
            conversations={conversations}
            activeConversationId={activeConversationId}
            disabled={isSending}
            onSelect={selectConversation}
            onNewQuestion={startNewQuestion}
            autoFocusSearch
          />
        </Drawer>
      )}

      {toast && <Toast message={toast} onDone={dismissToast} />}
    </div>
  )
}
