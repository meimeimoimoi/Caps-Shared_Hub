using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.AiChat;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class AiChatHandlerTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly Guid Stranger = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Jan1 = new(2026, 1, 1);
    private static readonly DateOnly Dec31 = new(2026, 12, 31);

    [Fact]
    public async Task Create_and_list_conversations_persist_and_return_owner_items()
    {
        var store = new Store();
        var created = await new CreateConversation.CreateConversationHandler(
            store,
            store,
            new FixedClock()
        ).HandleAsync(new(Owner, "CIT 2026"), default);

        var list = await new ListConversations.ListConversationsHandler(store).HandleAsync(
            new(Owner),
            default
        );

        Assert.Single(list);
        Assert.Equal((created.Id, "CIT 2026"), (list[0].Id, list[0].Title));
        Assert.True(store.Saved);
    }

    [Fact]
    public async Task Send_records_free_usage_when_answered_and_stores_citations()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "New Conversation");
        store.NextRagResponse = new(
            "The standard CIT rate is 20%.",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            Jan1,
            Dec31,
            [
                new(
                    "320/2025/ND-CP",
                    "Decree 320",
                    "Article 11",
                    null,
                    null,
                    "20% tax rate",
                    Jan1,
                    null
                ),
            ]
        );

        var result = await SendHandler(store)
            .HandleAsync(
                new(conversation.Id, Owner, "What is the CIT rate in 2026?", Jan1, Dec31),
                default
            );

        Assert.Equal(AiUsagePaidWith.Free, Assert.Single(store.Usages).PaidWith);
        Assert.Equal(2, store.Messages.Count);
        Assert.Equal("What is the CIT rate in 2026?", conversation.Title);
        Assert.Single(result.AiMessageDto.Citations!);
    }

    [Fact]
    public async Task Send_does_not_record_usage_when_clarification_is_needed()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        store.NextRagResponse = new(
            "Which tax period do you mean?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );

        await SendHandler(store)
            .HandleAsync(new(conversation.Id, Owner, "What is the CIT rate?", null, null), default);

        Assert.Empty(store.Usages);
    }

    [Fact]
    public async Task Clarify_rejects_message_not_awaiting_clarification()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        var aiMessage = ChatMessage.CreateAiMessage(
            conversation.Id,
            "Answered",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            Jan1,
            Dec31,
            null,
            Now
        );
        store.Messages.Add(aiMessage);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            ClarifyHandler(store)
                .HandleAsync(new(aiMessage.Id, Owner, "Year 2026", Jan1, Dec31), default)
        );

        Assert.Equal("WORKFLOW_INVALID_CLARIFICATION_TARGET", ex.Code);
        Assert.Null(store.LastRagRequest);
    }

    [Fact]
    public async Task Clarify_forwards_original_question_and_records_free_usage_when_answered()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        var userQuestion = ChatMessage.CreateUserMessage(
            conversation.Id,
            "What is the CIT rate?",
            null,
            null,
            Now.AddMinutes(-2)
        );
        var aiPrompt = ChatMessage.CreateAiMessage(
            conversation.Id,
            "Which tax period?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now.AddMinutes(-1)
        );
        store.Messages.AddRange([userQuestion, aiPrompt]);
        store.NextRagResponse = new(
            "20% for 2026.",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            Jan1,
            Dec31,
            []
        );

        await ClarifyHandler(store)
            .HandleAsync(new(aiPrompt.Id, Owner, "For fiscal year 2026", Jan1, Dec31), default);

        Assert.Equal("What is the CIT rate?", store.LastRagRequest?.Query);
        Assert.Equal("For fiscal year 2026", store.LastRagRequest?.Clarification);
        Assert.Equal(AiUsagePaidWith.Free, Assert.Single(store.Usages).PaidWith);
    }

    [Fact]
    public async Task Messages_and_citations_reject_strangers_and_deserialize_citations()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Topic");
        store.NextRagResponse = new(
            "Answer",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            Jan1,
            Dec31,
            [new("123/2026/TT-BTC", "Circular 123", "Art 5", null, null, "Text", Jan1, null)]
        );
        var sent = await SendHandler(store)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        await Assert.ThrowsAsync<AppException>(() =>
            new GetConversationMessages.GetConversationMessageHandler(store, store).HandleAsync(
                new(conversation.Id, Stranger),
                default
            )
        );
        await Assert.ThrowsAsync<AppException>(() =>
            new GetMessageCitations.GetMessageCitationsHandler(store, store).HandleAsync(
                new(sent.AiMessageDto.Id, Stranger),
                default
            )
        );

        var messages = await new GetConversationMessages.GetConversationMessageHandler(
            store,
            store
        ).HandleAsync(new(conversation.Id, Owner), default);
        var citations = await new GetMessageCitations.GetMessageCitationsHandler(
            store,
            store
        ).HandleAsync(new(sent.AiMessageDto.Id, Owner), default);

        Assert.Equal(2, messages.Count);
        Assert.Equal("123/2026/TT-BTC", Assert.Single(citations).DocNumber);
    }

    private static SendChatMessage.SendChatMessageHandler SendHandler(Store store) =>
        new(store, store, store, store, store, new FixedClock());

    private static ClarifyChatMessage.ClarifyChatMessageHandler ClarifyHandler(Store store) =>
        new(store, store, store, store, store, new FixedClock());

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Store
        : IConversationRepository,
            IChatMessageRepository,
            IAiUsageRepository,
            IRagQueryClient,
            IUnitOfWork,
            ITransaction
    {
        public List<Conversation> Conversations { get; } = [];
        public List<ChatMessage> Messages { get; } = [];
        public List<AiUsage> Usages { get; } = [];
        public RagQueryRequest? LastRagRequest { get; private set; }
        public RagQueryResponse NextRagResponse { get; set; } =
            new(
                "Default",
                ChatMessageScopeResult.InScope,
                ChatMessageAnswerStatus.Answered,
                Jan1,
                Dec31,
                []
            );
        public bool Saved { get; private set; }

        public Conversation AddConversation(Guid owner, string title)
        {
            var conversation = Conversation.Create(owner, title, Now);
            Conversations.Add(conversation);
            return conversation;
        }

        Task<Conversation?> IConversationRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Conversations.SingleOrDefault(c => c.Id == id));

        public Task<IReadOnlyList<Conversation>> GetByUserIdAsync(
            Guid userId,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<Conversation>>(
                Conversations.Where(c => c.UserId == userId).ToList()
            );

        public Task AddAsync(Conversation conversation, CancellationToken ct = default)
        {
            Conversations.Add(conversation);
            return Task.CompletedTask;
        }

        Task<ChatMessage?> IChatMessageRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Messages.SingleOrDefault(m => m.Id == id));

        public Task<IReadOnlyList<ChatMessage>> GetByConversationIdAsync(
            Guid conversationId,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<ChatMessage>>(
                Messages
                    .Where(m => m.ConversationId == conversationId)
                    .OrderBy(m => m.CreatedAt)
                    .ToList()
            );

        public Task<ChatMessage?> GetLatestAnsweredMessageAsync(
            Guid conversationId,
            CancellationToken ct = default
        ) =>
            Task.FromResult(
                Messages
                    .Where(m =>
                        m.ConversationId == conversationId
                        && m.Sender == ChatMessageSender.AI
                        && m.AnswerStatus == ChatMessageAnswerStatus.Answered
                    )
                    .OrderByDescending(m => m.CreatedAt)
                    .FirstOrDefault()
            );

        public Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default)
        {
            Messages.Add(chatMessage);
            return Task.CompletedTask;
        }

        public Task AddAsync(AiUsage usage, CancellationToken ct = default)
        {
            Usages.Add(usage);
            return Task.CompletedTask;
        }

        public Task<RagQueryResponse> QueryAsync(
            RagQueryRequest request,
            CancellationToken ct = default
        )
        {
            LastRagRequest = request;
            return Task.FromResult(NextRagResponse);
        }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saved = true;
            return Task.CompletedTask;
        }

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
