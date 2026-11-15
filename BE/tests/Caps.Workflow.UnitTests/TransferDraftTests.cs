using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.AiChat;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class TransferDraftTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UnixEpoch;

    [Fact]
    public async Task Only_an_answered_ai_message_seeds_a_draft()
    {
        var store = new Store();
        var question = ChatMessage.CreateUserMessage(store.Conversation.Id, "Q?", null, null, Now);
        var clarify = ChatMessage.CreateAiMessage(
            store.Conversation.Id,
            "Which period?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now
        );
        var answer = ChatMessage.CreateAiMessage(
            store.Conversation.Id,
            "Answer",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            null,
            null,
            null,
            Now
        );
        store.Messages.AddRange([question, clarify, answer]);
        var handler = new TransferConversationDraft.TransferConversationDraftHandler(store, store);

        foreach (var wrong in new[] { question, clarify })
        {
            var e = await Assert.ThrowsAsync<AppException>(() =>
                handler.HandleAsync(new(store.Conversation.Id, Owner, wrong.Id), default)
            );
            Assert.Equal("WORKFLOW_NO_ANSWERABLE_MESSAGE_FOR_DRAFT", e.Code);
        }

        var draft = await handler.HandleAsync(
            new(store.Conversation.Id, Owner, answer.Id),
            default
        );
        Assert.Equal(answer.Id, draft.SourceMessageId);
    }

    private sealed class Store : IConversationRepository, IChatMessageRepository
    {
        public Conversation Conversation { get; } = Conversation.Create(Owner, "Topic", Now);
        public List<ChatMessage> Messages { get; } = [];

        public Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult<Conversation?>(id == Conversation.Id ? Conversation : null);

        Task<ChatMessage?> IChatMessageRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Messages.SingleOrDefault(x => x.Id == id));

        public Task<ChatMessage?> GetLatestAnsweredMessageAsync(
            Guid conversationId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<ChatMessage>> GetByConversationIdAsync(
            Guid conversationId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Conversation>> GetByUserIdAsync(
            Guid userId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task AddAsync(Conversation conversation, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }
}
