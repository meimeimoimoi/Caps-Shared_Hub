import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { Conversation } from '../types'

type ConversationSidebarProps = {
    onNewConversation: () => void
    isSending: boolean
    conversations: Conversation[]
    onSelectConversation: (id: string) => void
    activeConversationId: string | null
}

export function ConversationSidebar({
    onNewConversation,
    isSending,
    conversations,
    onSelectConversation,
    activeConversationId,
} : ConversationSidebarProps){

    const [search, setSearch] = useState('')

    const filteredConversations = conversations.filter(
    (conversations) =>
        conversations.title
        .toLocaleLowerCase('vi')
        .includes(search.trim().toLocaleLowerCase('vi')),
    )

    return (
        <>
            <div className='p-3'>
                <label htmlFor='conversation-search' className='sr-only'>
                    Tìm cuộc trò chuyện
                </label>
                <div className='flex items-center gap-2 rounded-lg border border-[#E4E4E1] bg-white px-3 py-2'>
                    <Search
                    size={16}
                    aria-hidden="true"
                    className='shrink-0 text-gray-500'
                    />
                    <input
                    id="conversation-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm cuộc trò chuyện"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                </div>
            </div>

            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E4E4E1] px-4">
                <h2 className="">
                    Trợ lý AI
                </h2>

                <button
                type="button"
                onClick={onNewConversation}
                disabled={isSending}
                className="flex items-center gap-1 rounded-lg border border-black bg-white px-3 py-1.5 text-sm font-semibold"
                >
                    <Plus size={16} aria-hidden="true"/>
                    Mới
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                <h3 className="mb-2 text-xs font-semibold text-gray-500">
                    Cuộc trò chuyện
                </h3>

                {filteredConversations.length > 0 ? (
                    <ul className="space-y-1">
                    {filteredConversations.map((conversation) => (
                        <li key={conversation.id}>
                            <button
                                type="button"
                                title={conversation.title}
                                disabled={isSending}
                                onClick={() => onSelectConversation(conversation.id)}
                                aria-current={
                                    conversation.id === activeConversationId ? 'true' : undefined
                                    }
                                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                                    conversation.id === activeConversationId
                                        ? 'bg-white font-semibold text-black'
                                        : 'text-gray-700 hover:bg-white'
                                }`}
                            >
                                {conversation.title}
                            </button>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p role="status" className="px-3 py-2 text-sm text-gray-500">
                    Không tìm thấy cuộc trò chuyện.
                    </p>
                )}
            </div>
        </>
    )
}