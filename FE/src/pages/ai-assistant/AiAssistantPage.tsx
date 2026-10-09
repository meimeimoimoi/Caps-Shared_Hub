import { useCallback, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  History,
  LayoutDashboard,
  LogIn,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { Drawer } from '@/components/ui/feedback/drawer'
import { Toast } from '@/components/ui/feedback/toast'
import { AppHeader } from '@/components/ui/layout/app-header'
import {
  AppSidebar,
  type SidebarGroup,
} from '@/components/ui/layout/app-sidebar'
import { useDialogMotion, useReducedMotion } from '@/components/ui/motion'
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

  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const navDrawer = useRef<HTMLDialogElement>(null)
  const navTrigger = useRef<HTMLButtonElement>(null)
  const historyTrigger = useRef<HTMLButtonElement>(null)
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

  const groups: SidebarGroup[] = [
    {
      id: 'workspace',
      items: [
        {
          id: 'ai-assistant',
          to: '/ai-assistant',
          label: t('navigation:aiAssistant'),
          icon: <Sparkles size={18} />,
          active: true,
        },
        {
          id: 'drafts',
          to: '/drafts',
          label: t('navigation:workspaces'),
          icon: <FileText size={18} />,
        },
        {
          id: 'dashboard',
          to: '/dashboard',
          label: t('navigation:dashboard'),
          icon: <LayoutDashboard size={18} />,
        },
      ],
    },
  ]

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

  const historyProps = {
    conversations,
    activeConversationId,
    disabled: isSending,
    onSelect: selectConversation,
    onNewQuestion: startNewQuestion,
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
        className={`bg-sidebar border-sidebar hidden shrink-0 flex-col border-r py-6 md:flex ${sidebarExpanded ? 'w-60 px-4' : 'w-20 px-3'}`}
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

        <DemoBanner>
          <p>
            <Trans
              t={t}
              i18nKey="aiAssistant:demoDisclosure"
              components={{ strong: <strong /> }}
            />
          </p>
        </DemoBanner>

        <div className="flex min-h-0 flex-1">
          {/* Lịch sử tra cứu (từ lg) */}
          <aside className="bg-surface-muted border-border hidden w-72 shrink-0 flex-col border-r lg:flex">
            <ConversationHistory {...historyProps} />
          </aside>

          <main
            id="assistant-main"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col focus:outline-none"
          >
            {/* Thanh công cụ dưới lg: lịch sử nằm trong Drawer */}
            <div className="border-border-subtle bg-canvas flex items-center justify-between gap-2 border-b px-4 py-2 lg:hidden">
              <Button
                ref={historyTrigger}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                aria-haspopup="dialog"
                aria-label={t('aiAssistant:history.open')}
              >
                <History size={16} aria-hidden="true" />
                {t('aiAssistant:history.title')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startNewQuestion}
                disabled={isSending}
              >
                <Plus size={16} aria-hidden="true" />
                {t('aiAssistant:history.newQuestion')}
              </Button>
            </div>

            <div
              ref={scrollArea}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-10"
            >
              {messages.length === 0 && !isSending ? (
                <AssistantWelcome onSelectQuestion={selectQuestion} />
              ) : (
                <Transcript
                  messages={messages}
                  isSending={isSending}
                  onCopy={copyAnswer}
                />
              )}
            </div>

            {/* Ô hỏi luôn ở đáy; tôn trọng vùng an toàn trên điện thoại */}
            <div className="border-border-subtle bg-canvas border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-10 md:pt-4 md:pb-5">
              <ChatComposer
                ref={composer}
                value={question}
                onChange={setQuestion}
                onSend={handleSend}
                isSending={isSending}
                error={error ? t(`aiAssistant:${error}`) : null}
              />
            </div>
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
          <div className="-mx-5 -my-4 flex h-full flex-col">
            <ConversationHistory {...historyProps} showTitle={false} />
          </div>
        </Drawer>
      )}

      {toast && <Toast message={toast} onDone={dismissToast} />}
    </div>
  )
}
