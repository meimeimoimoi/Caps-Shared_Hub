import { AssitantWelcome } from "@/features/ai-assistant/components/AssitantWelcome"
import { ChatComposer } from "@/features/ai-assistant/components/ChatComposer"
import { MessageList } from "@/features/ai-assistant/components/MessageList"
import { ConversationSidebar } from "@/features/ai-assistant/components/ConversationSidebar"
import { AssitantHeader } from "@/features/ai-assistant/components/AssitantHeader"
import { userAiAssitant } from "@/features/ai-assistant/hooks/useAiAssistant"
import { AppSidebar } from '@/components/ui/layout/app-sidebar'
import { Sparkles, LayoutDashboard, FileText } from 'lucide-react'

import { useEffect, useRef, useState } from "react"

export default function AiAssitantPage() {
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
    } = userAiAssitant()

    const sidebarGroups = [
        {
            id: 'main',
            items: [
            {
                id: 'ai-assistant',
                to: '/ai-assistant',
                label: 'Trợ lý AI',
                icon: <Sparkles size={20} />,
                active: true,
            },
            {
                id: 'drafts',
                to: '/drafts',
                label: 'Soạn nháp',
                icon: <FileText size={20} />,
            },
            {
                id: 'dashboard',
                to: '/expert-dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard size={20} />,
            },
            ],
        },
    ]

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
    const [isNavigationOpen, setIsNavigationOpen] = useState(false)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        })
    }, [messages, isSending])

    function handleToggleNavigation() {
        setIsNavigationOpen((current) => !current)
        setIsHistoryOpen(false)
    }

    function handleToggleHistory() {
        setIsHistoryOpen((current) => !current)
        setIsNavigationOpen(false)
    }

    return (
        <div className="flex h-dvh overflow-hidden bg-white">
            {/* Thanh điều hướng chính */}
            <aside
                className={`hidden shrink-0 flex-col border-r border-black bg-black px-3 py-6 md:flex ${
                    isSidebarExpanded ? 'w-60' : 'w-20'
                }`}
                >
                <AppSidebar
                    groups={sidebarGroups}
                    navigationLabel="Điều hướng chính"
                    collapsed={!isSidebarExpanded}
                    onToggleCollapse={() => {
                    setIsSidebarExpanded((current) => !current)
                    }}
                />
            </aside>

            {/* Danh sách hội thoại */}
            <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#E4E4E1] bg-[#F7F7F5] lg:flex">
                <ConversationSidebar 
                onNewConversation={handleNewConversation}
                onSelectConversation={handleSelectConversation}
                isSending={isSending}
                conversations={conversations}
                activeConversationId={activeConversationId}
                />
            </aside>

            {/* Khu vực trò chuyện */}
            <main className="flex min-w-0 flex-1 flex-col">
                <AssitantHeader 
                title={conversationTitle}
                onNewConversation={handleNewConversation}
                isSending={isSending}
                isHistoryOpen={isHistoryOpen}
                onToggleHistory={handleToggleHistory}
                isNavigationOpen={isNavigationOpen}
                onToggleNavigation={handleToggleNavigation}
                />
                {isNavigationOpen && (
                <div
                    id="mobile-main-navigation"
                    className="flex max-h-[40dvh] shrink-0 flex-col overflow-y-auto bg-black px-4 py-4 md:hidden"
                >
                    <AppSidebar
                    groups={sidebarGroups}
                    navigationLabel="Điều hướng chính trên mobile"
                    collapsed={false}
                    onNavigate={() => setIsNavigationOpen(false)}
                    />
                </div>
                )}

                {isHistoryOpen && (
                <div
                    id="mobile-conversation-history"
                    className="flex max-h-[40dvh] shrink-0 flex-col overflow-y-auto border-b border-[#E4E4E1] bg-[#F7F7F5] lg:hidden"
                >
                    <ConversationSidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    isSending={isSending}
                    onNewConversation={() => {
                        handleNewConversation()
                        setIsHistoryOpen(false)
                    }}
                    onSelectConversation={(id) => {
                        handleSelectConversation(id)
                        setIsHistoryOpen(false)
                    }}
                    />
                </div>
                )}

                <section className="min-h-0 flex-1 overflow-y-auto px-6 py-12">
                    <div className="mx-auto w-full max-w-[760px]">
                        {messages.length === 0 ? (
                        <AssitantWelcome onSelectQuestion={setQuestion} />
                            ) : (
                                <>
                                <MessageList 
                                messages={messages}
                                isSending={isSending}
                                />
                                <div ref={messagesEndRef} />
                                </>
                            )}
                    </div>
                </section>
                            
                {error && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                        {error}
                    </p>
                )}
                <footer className="shrink-0 border-t border-[#E4E4E1] px-6 py-4">
                    <div className="mx-auto w-full max-w-[760px]">
                        <ChatComposer
                        value={question}
                        onChange={setQuestion}
                        onSend={handleSend}
                        isSending={isSending}
                        />
                    </div>
                </footer>
            </main>
        </div>
    )
}
