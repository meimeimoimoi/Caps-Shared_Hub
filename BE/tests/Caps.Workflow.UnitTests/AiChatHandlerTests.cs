using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.Features.AiChat;
using Caps.Workflow.Domain.Exceptions;
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
    public async Task Send_and_clarify_stay_free_when_ai_billing_is_disabled()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        var freeSettings = new AiBillingSettings { Enabled = false };

        var sent = await SendHandler(store, freeSettings)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        var clarifyConversation = store.AddConversation(Owner, "Clarify topic");
        var userPrompt = ChatMessage.CreateUserMessage(
            clarifyConversation.Id,
            "What is the VAT rate?",
            null,
            null,
            Now.AddMinutes(-2)
        );
        var aiPrompt = ChatMessage.CreateAiMessage(
            clarifyConversation.Id,
            "Which period?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now.AddMinutes(-1)
        );
        store.Messages.AddRange([userPrompt, aiPrompt]);

        var clarified = await ClarifyHandler(store, freeSettings)
            .HandleAsync(new(aiPrompt.Id, Owner, "For 2026", Jan1, Dec31), default);

        Assert.Equal(ChatMessageSender.AI, sent.AiMessageDto.Sender);
        Assert.Equal(ChatMessageSender.AI, clarified.AiMessageDto.Sender);
        Assert.Empty(store.HoldCalls);
        Assert.Empty(store.CaptureCalls);
        Assert.Empty(store.ReleaseCalls);
        Assert.Equal(2, store.Usages.Count);
        Assert.All(
            store.Usages,
            usage =>
                Assert.Equal(
                    (AiUsagePaidWith.Free, 0L, AiUsageState.Captured),
                    (usage.PaidWith, usage.CreditHold, usage.State)
                )
        );
    }

    [Fact]
    public async Task The_admin_switch_turned_off_makes_ai_free_even_when_the_setting_charges()
    {
        var store = new Store
        {
            BillingSwitch = AiBillingSwitch.Create(false, Guid.NewGuid(), Now),
        };
        var conversation = store.AddConversation(Owner, "Tax question");

        await SendHandler(store, EnabledBillingSettings)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        Assert.Empty(store.HoldCalls);
        Assert.Equal(AiUsagePaidWith.Free, Assert.Single(store.Usages).PaidWith);
    }

    [Fact]
    public async Task Send_rejects_when_wallet_credits_are_exhausted()
    {
        var store = new Store { WalletBalance = 500 };
        var conversation = store.AddConversation(Owner, "Tax question");

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            SendHandler(store, EnabledBillingSettings)
                .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default)
        );

        Assert.Equal("INSUFFICIENT_CREDITS", ex.Code);
        Assert.Null(store.LastRagRequest);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Send_holds_and_captures_credits_when_answered()
    {
        var store = new Store { WalletBalance = 5_000 };
        var conversation = store.AddConversation(Owner, "Tax question");

        await SendHandler(store, EnabledBillingSettings)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        Assert.Equal(4_000, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        Assert.Single(store.CaptureCalls);
        Assert.Empty(store.ReleaseCalls);
        var usage = Assert.Single(store.Usages);
        Assert.Equal(
            (AiUsagePaidWith.Credit, 1_000L, AiUsageState.Captured),
            (usage.PaidWith, usage.CreditHold, usage.State)
        );
    }

    [Fact]
    public async Task Send_releases_held_credits_when_clarification_is_needed_or_rag_fails()
    {
        var clarifyStore = new Store { WalletBalance = 5_000 };
        var conv1 = clarifyStore.AddConversation(Owner, "Tax question");
        clarifyStore.NextRagResponse = new(
            "Which period?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );

        await SendHandler(clarifyStore, EnabledBillingSettings)
            .HandleAsync(new(conv1.Id, Owner, "Question", null, null), default);

        Assert.Equal(5_000, clarifyStore.WalletBalance);
        Assert.Single(clarifyStore.HoldCalls);
        Assert.Empty(clarifyStore.CaptureCalls);
        Assert.Single(clarifyStore.ReleaseCalls);
        Assert.Equal(AiUsageState.Refunded, Assert.Single(clarifyStore.Usages).State);

        var failStore = new Store { WalletBalance = 5_000, FailRag = true };
        var conv2 = failStore.AddConversation(Owner, "Tax question");

        await Assert.ThrowsAsync<AppException>(() =>
            SendHandler(failStore, EnabledBillingSettings)
                .HandleAsync(new(conv2.Id, Owner, "Question", Jan1, Dec31), default)
        );

        Assert.Equal(5_000, failStore.WalletBalance);
        Assert.Single(failStore.HoldCalls);
        Assert.Single(failStore.ReleaseCalls);
        Assert.False(failStore.Saved);
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

    [Fact]
    public async Task Send_ignores_free_quota_when_ai_billing_is_disabled()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        var settings = new AiBillingSettings
        {
            Enabled = false,
            FreeQuotaEnabled = true,
            InitialFreeQuota = 10,
        };

        await SendHandler(store, settings)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        Assert.Empty(store.Quotas);
        Assert.Empty(store.HoldCalls);
        Assert.Equal(AiUsagePaidWith.Free, Assert.Single(store.Usages).PaidWith);
    }

    [Fact]
    public async Task Send_charges_credits_immediately_when_free_quota_is_disabled()
    {
        var store = new Store { WalletBalance = 2_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        var settings = new AiBillingSettings
        {
            Enabled = true,
            FreeQuotaEnabled = false,
            InitialFreeQuota = 10,
            ChatCreditCost = 1_000,
        };

        await SendHandler(store, settings)
            .HandleAsync(new(conversation.Id, Owner, "Question", Jan1, Dec31), default);

        Assert.Empty(store.Quotas);
        Assert.Equal(1_000, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        Assert.Equal(AiUsagePaidWith.Credit, Assert.Single(store.Usages).PaidWith);
    }

    [Fact]
    public async Task Send_uses_initial_free_quota_then_falls_back_to_credits_when_enabled()
    {
        var store = new Store { WalletBalance = 1_500 };
        var conversation = store.AddConversation(Owner, "Tax question");
        var settings = new AiBillingSettings
        {
            Enabled = true,
            FreeQuotaEnabled = true,
            InitialFreeQuota = 2,
            ChatCreditCost = 1_000,
        };

        await SendHandler(store, settings)
            .HandleAsync(new(conversation.Id, Owner, "Question 1", Jan1, Dec31), default);
        await SendHandler(store, settings)
            .HandleAsync(new(conversation.Id, Owner, "Question 2", Jan1, Dec31), default);

        Assert.Equal(0, store.Quotas[Owner].Balance);
        Assert.Empty(store.HoldCalls);
        Assert.Equal(1_500, store.WalletBalance);

        await SendHandler(store, settings)
            .HandleAsync(new(conversation.Id, Owner, "Question 3", Jan1, Dec31), default);

        Assert.Equal(500, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        Assert.Equal(
            [AiUsagePaidWith.Quota, AiUsagePaidWith.Quota, AiUsagePaidWith.Credit],
            store.Usages.Select(u => u.PaidWith).ToArray()
        );

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            SendHandler(store, settings)
                .HandleAsync(new(conversation.Id, Owner, "Question 4", Jan1, Dec31), default)
        );
        Assert.Equal("INSUFFICIENT_CREDITS", ex.Code);
    }

    [Fact]
    public async Task Send_refunds_free_quota_when_clarification_is_needed_or_rag_fails()
    {
        var clarifyStore = new Store();
        var conv1 = clarifyStore.AddConversation(Owner, "Tax question");
        clarifyStore.NextRagResponse = new(
            "Which period?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );
        var settings = new AiBillingSettings
        {
            Enabled = true,
            FreeQuotaEnabled = true,
            InitialFreeQuota = 2,
            ChatCreditCost = 1_000,
        };

        await SendHandler(clarifyStore, settings)
            .HandleAsync(new(conv1.Id, Owner, "Question", null, null), default);

        Assert.Equal(2, clarifyStore.Quotas[Owner].Balance);
        Assert.Empty(clarifyStore.Usages);
        Assert.Empty(clarifyStore.HoldCalls);

        var failStore = new Store { FailRag = true };
        var conv2 = failStore.AddConversation(Owner, "Tax question");

        await Assert.ThrowsAsync<AppException>(() =>
            SendHandler(failStore, settings)
                .HandleAsync(new(conv2.Id, Owner, "Question", Jan1, Dec31), default)
        );

        Assert.Equal(2, failStore.Quotas[Owner].Balance);
        Assert.Empty(failStore.Usages);
        Assert.False(failStore.Saved);
    }

    [Fact]
    public async Task Send_sets_round_one_and_24h_deadline_when_clarification_is_needed()
    {
        var store = new Store();
        var conversation = store.AddConversation(Owner, "Tax question");
        store.NextRagResponse = new(
            "Vui lòng cho biết kỳ tính thuế áp dụng?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );

        var result = await SendHandler(store)
            .HandleAsync(
                new(conversation.Id, Owner, "Chi phí tiếp khách có được trừ?", null, null),
                default
            );

        Assert.Equal(ChatMessageAnswerStatus.NeedClarification, result.AiMessageDto.AnswerStatus);
        Assert.Equal(1, result.AiMessageDto.ClarificationRound);
        Assert.Equal(Now.AddHours(24), result.AiMessageDto.ClarificationDeadline);
        Assert.Null(result.AiMessageDto.ClosureReason);
        Assert.Equal(result.UserMessageDto.Id, store.Messages.Last().RootQuestionId);
    }

    [Fact]
    public async Task Clarify_allows_two_rounds_then_closes_as_insufficient_information_with_summary()
    {
        var clock = new MutableClock(Now);
        var store = new Store { WalletBalance = 5_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        store.NextRagResponse = new(
            "Vui lòng cho biết kỳ tính thuế áp dụng?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );

        var initial = await SendHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(
                new(
                    conversation.Id,
                    Owner,
                    "Chi phí tài trợ có được trừ thuế TNDN không?",
                    null,
                    null
                ),
                default
            );
        Assert.Equal(1, initial.AiMessageDto.ClarificationRound);

        // Round 1 reply -> AI still needs clarification -> Round 2 (deadline refreshed to +24h)
        clock.Advance(TimeSpan.FromHours(2));
        store.NextRagResponse = new(
            "Vui lòng bổ sung loại hình tổ chức nhận tài trợ và năm phát sinh?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );
        var round2 = await ClarifyHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(
                new(initial.AiMessageDto.Id, Owner, "Chi cho hội thảo địa phương", null, null),
                default
            );

        Assert.Equal(ChatMessageAnswerStatus.NeedClarification, round2.AiMessageDto.AnswerStatus);
        Assert.Equal(2, round2.AiMessageDto.ClarificationRound);
        Assert.Equal(clock.Current.AddHours(24), round2.AiMessageDto.ClarificationDeadline);
        Assert.Equal("Chi phí tài trợ có được trừ thuế TNDN không?", store.LastRagRequest?.Query);

        // Round 1 prompt is resolved and cannot be clarified again
        var replayEx = await Assert.ThrowsAsync<AppException>(() =>
            ClarifyHandler(store, EnabledBillingSettings, clock)
                .HandleAsync(new(initial.AiMessageDto.Id, Owner, "Duplicate", null, null), default)
        );
        Assert.Equal("WORKFLOW_INVALID_CLARIFICATION_TARGET", replayEx.Code);

        // Round 2 reply -> AI STILL needs clarification -> closed as INSUFFICIENT_INFORMATION
        clock.Advance(TimeSpan.FromHours(1));
        store.NextRagResponse = new(
            "Vẫn thiếu kỳ tính thuế và hồ sơ chứng từ tài trợ.",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );
        var closed = await ClarifyHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(
                new(round2.AiMessageDto.Id, Owner, "Không rõ tổ chức nhận", null, null),
                default
            );

        Assert.Equal("Chi phí tài trợ có được trừ thuế TNDN không?", store.LastRagRequest?.Query);
        Assert.Contains("Chi cho hội thảo địa phương", store.LastRagRequest?.Clarification);
        Assert.Contains("Không rõ tổ chức nhận", store.LastRagRequest?.Clarification);
        Assert.Equal(
            ChatMessageAnswerStatus.InsufficientInformation,
            closed.AiMessageDto.AnswerStatus
        );
        Assert.Equal(
            ChatMessageClosureReason.ClarificationLimitReached,
            closed.AiMessageDto.ClosureReason
        );
        Assert.Equal(2, closed.AiMessageDto.ClarificationRound);
        Assert.Null(closed.AiMessageDto.ClarificationDeadline);
        Assert.False(string.IsNullOrWhiteSpace(closed.AiMessageDto.MissingInformationSummary));
        Assert.Contains("Vẫn thiếu kỳ tính thuế", closed.AiMessageDto.MissingInformationSummary);
        Assert.Contains("không đưa ra kết luận chắc chắn", closed.AiMessageDto.Content);

        // Credit was never captured: all holds were released and wallet balance stays intact
        Assert.Equal(5_000, store.WalletBalance);
        Assert.Empty(store.CaptureCalls);
        Assert.Equal(3, store.ReleaseCalls.Count);
        Assert.All(store.Usages, u => Assert.Equal(AiUsageState.Refunded, u.State));
    }

    [Fact]
    public async Task Clarify_succeeds_on_round_two_and_captures_credit_when_answered()
    {
        var clock = new MutableClock(Now);
        var store = new Store { WalletBalance = 5_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        store.NextRagResponse = new(
            "Kỳ tính thuế nào?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            []
        );
        var round1 = await SendHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(conversation.Id, Owner, "Thuế suất TNDN?", null, null), default);

        clock.Advance(TimeSpan.FromHours(1));
        var round2 = await ClarifyHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(
                new(round1.AiMessageDto.Id, Owner, "Doanh nghiệp nhỏ", null, null),
                default
            );
        Assert.Equal(2, round2.AiMessageDto.ClarificationRound);

        clock.Advance(TimeSpan.FromHours(1));
        store.NextRagResponse = new(
            "Thuế suất TNDN phổ thông năm 2026 là 20%.",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.Answered,
            Jan1,
            Dec31,
            []
        );
        var answered = await ClarifyHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(round2.AiMessageDto.Id, Owner, "Năm 2026", Jan1, Dec31), default);

        Assert.Equal(ChatMessageAnswerStatus.Answered, answered.AiMessageDto.AnswerStatus);
        Assert.Equal(4_000, store.WalletBalance);
        Assert.Single(store.CaptureCalls);
    }

    [Fact]
    public async Task Clarify_after_24h_closes_question_as_user_did_not_clarify_without_calling_rag()
    {
        var clock = new MutableClock(Now);
        var store = new Store { WalletBalance = 4_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        var rootQuestion = ChatMessage.CreateUserMessage(
            conversation.Id,
            "Chi phí lãi vay có bị khống chế?",
            null,
            null,
            Now
        );
        var prompt = ChatMessage.CreateAiMessage(
            conversation.Id,
            "Vui lòng cho biết kỳ tính thuế và doanh nghiệp có giao dịch liên kết không?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now,
            clarificationRound: 1,
            clarificationDeadline: Now.AddHours(24),
            rootQuestionId: rootQuestion.Id
        );
        store.Messages.AddRange([rootQuestion, prompt]);

        // Pre-existing reserved credit hold linked to the question must be released on expiry
        var reservedUsage = AiUsage.Create(
            Owner,
            conversation.Id,
            rootQuestion.Id,
            AiUsagePaidWith.Credit,
            1_000,
            AiUsageState.Reserved,
            Now
        );
        store.WalletHeld = 1_000;
        store.Usages.Add(reservedUsage);

        clock.Advance(TimeSpan.FromHours(24));

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            ClarifyHandler(store, EnabledBillingSettings, clock)
                .HandleAsync(new(prompt.Id, Owner, "Năm 2026", Jan1, Dec31), default)
        );

        Assert.Equal("WORKFLOW_CLARIFICATION_EXPIRED", ex.Code);
        Assert.Null(store.LastRagRequest);
        Assert.NotNull(prompt.ClarificationResolvedAt);
        var closed = store.Messages.Last();
        Assert.Equal(ChatMessageAnswerStatus.InsufficientInformation, closed.AnswerStatus);
        Assert.Equal(ChatMessageClosureReason.UserDidNotClarify, closed.ClosureReason);
        Assert.False(string.IsNullOrWhiteSpace(closed.MissingInformationSummary));
        Assert.Contains("không đưa ra kết luận chắc chắn", closed.Content);
        Assert.Equal(AiUsageState.Refunded, reservedUsage.State);
        Assert.Equal(5_000, store.WalletBalance);
        Assert.Single(store.ReleaseCalls, reservedUsage.Id);
    }

    [Fact]
    public async Task Expire_clarification_closes_overdue_prompt_and_releases_reserved_credit()
    {
        var clock = new MutableClock(Now);
        var store = new Store { WalletBalance = 4_000, WalletHeld = 1_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        var rootQuestion = ChatMessage.CreateUserMessage(
            conversation.Id,
            "Chi phí quảng cáo có được trừ?",
            null,
            null,
            Now
        );
        var prompt = ChatMessage.CreateAiMessage(
            conversation.Id,
            "Vui lòng cho biết năm phát sinh giao dịch?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now,
            clarificationRound: 1,
            clarificationDeadline: Now.AddHours(24),
            rootQuestionId: rootQuestion.Id
        );
        store.Messages.AddRange([rootQuestion, prompt]);
        var reservedUsage = AiUsage.Create(
            Owner,
            conversation.Id,
            rootQuestion.Id,
            AiUsagePaidWith.Credit,
            1_000,
            AiUsageState.Reserved,
            Now
        );
        store.Usages.Add(reservedUsage);

        // Before 24 hours: expiry job must leave prompt open
        clock.Advance(TimeSpan.FromHours(23).Add(TimeSpan.FromMinutes(59)));
        await ExpireHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(prompt.Id), default);
        Assert.Equal(2, store.Messages.Count);
        Assert.Null(prompt.ClarificationResolvedAt);
        Assert.Empty(store.ReleaseCalls);

        // At 24 hours: closes with INSUFFICIENT_INFORMATION / USER_DID_NOT_CLARIFY and releases hold
        clock.Advance(TimeSpan.FromMinutes(1));
        await ExpireHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(prompt.Id), default);

        Assert.Equal(3, store.Messages.Count);
        Assert.NotNull(prompt.ClarificationResolvedAt);
        var closed = store.Messages.Last();
        Assert.Equal(ChatMessageAnswerStatus.InsufficientInformation, closed.AnswerStatus);
        Assert.Equal(ChatMessageClosureReason.UserDidNotClarify, closed.ClosureReason);
        Assert.Contains(
            "Vui lòng cho biết năm phát sinh giao dịch?",
            closed.MissingInformationSummary
        );
        Assert.Contains("không đưa ra kết luận chắc chắn", closed.Content);
        Assert.Equal(AiUsageState.Refunded, reservedUsage.State);
        Assert.Equal(5_000, store.WalletBalance);
        Assert.Single(store.ReleaseCalls, reservedUsage.Id);

        // Running again is idempotent
        await ExpireHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(prompt.Id), default);
        Assert.Equal(3, store.Messages.Count);
        Assert.Single(store.ReleaseCalls);
    }

    [Fact]
    public async Task Expire_clarification_keeps_captured_credit_intact_and_skips_billing_when_disabled()
    {
        var clock = new MutableClock(Now.AddHours(25));
        var store = new Store { WalletBalance = 4_000 };
        var conversation = store.AddConversation(Owner, "Tax question");
        var rootQuestion = ChatMessage.CreateUserMessage(
            conversation.Id,
            "Khấu hao TSCĐ?",
            null,
            null,
            Now
        );
        var prompt = ChatMessage.CreateAiMessage(
            conversation.Id,
            "Vui lòng nêu loại tài sản và kỳ tính thuế?",
            ChatMessageScopeResult.InScope,
            ChatMessageAnswerStatus.NeedClarification,
            null,
            null,
            null,
            Now,
            clarificationRound: 2,
            clarificationDeadline: Now.AddHours(24),
            rootQuestionId: rootQuestion.Id
        );
        store.Messages.AddRange([rootQuestion, prompt]);
        var capturedUsage = AiUsage.Create(
            Owner,
            conversation.Id,
            rootQuestion.Id,
            AiUsagePaidWith.Credit,
            1_000,
            AiUsageState.Captured,
            Now
        );
        store.Usages.Add(capturedUsage);

        await ExpireHandler(store, EnabledBillingSettings, clock)
            .HandleAsync(new(prompt.Id), default);

        Assert.Equal(AiUsageState.Captured, capturedUsage.State);
        Assert.Empty(store.ReleaseCalls);
        Assert.Equal(4_000, store.WalletBalance);
        var closed = store.Messages.Last();
        Assert.Equal(ChatMessageAnswerStatus.InsufficientInformation, closed.AnswerStatus);
        Assert.Equal(ChatMessageClosureReason.UserDidNotClarify, closed.ClosureReason);
        Assert.Equal(2, closed.ClarificationRound);
    }

    private static readonly AiBillingSettings FreeBillingSettings = new() { Enabled = false };

    private static readonly AiBillingSettings EnabledBillingSettings = new()
    {
        Enabled = true,
        ChatCreditCost = 1_000,
        DraftCreditCost = 2_000,
    };

    private static SendChatMessage.SendChatMessageHandler SendHandler(
        Store store,
        AiBillingSettings? settings = null,
        TimeProvider? clock = null
    )
    {
        var billing = settings ?? FreeBillingSettings;
        var time = clock ?? new FixedClock();
        var chargeService = new AiCreditChargeService(store, store, store, store, billing, time);
        return new(store, store, store, chargeService, billing, store, time);
    }

    private static ClarifyChatMessage.ClarifyChatMessageHandler ClarifyHandler(
        Store store,
        AiBillingSettings? settings = null,
        TimeProvider? clock = null
    )
    {
        var billing = settings ?? FreeBillingSettings;
        var time = clock ?? new FixedClock();
        var chargeService = new AiCreditChargeService(store, store, store, store, billing, time);
        return new(store, store, store, chargeService, billing, store, time);
    }

    private static ExpireChatClarificationHandler ExpireHandler(
        Store store,
        AiBillingSettings? settings = null,
        TimeProvider? clock = null
    )
    {
        var billing = settings ?? FreeBillingSettings;
        var time = clock ?? new FixedClock();
        var chargeService = new AiCreditChargeService(store, store, store, store, billing, time);
        return new(store, store, chargeService, store, time);
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class MutableClock(DateTimeOffset start) : TimeProvider
    {
        public DateTimeOffset Current { get; private set; } = start;

        public void Advance(TimeSpan delta) => Current = Current.Add(delta);

        public override DateTimeOffset GetUtcNow() => Current;
    }

    private sealed class Store
        : IConversationRepository,
            IChatMessageRepository,
            IAiQuotaRepository,
            IAiUsageRepository,
            IAiCredits,
            IAiBillingSwitchRepository,
            IRagQueryClient,
            IUnitOfWork,
            ITransaction
    {
        public List<Conversation> Conversations { get; } = [];
        public List<ChatMessage> Messages { get; } = [];
        public Dictionary<Guid, AiQuota> Quotas { get; } = [];
        public List<AiUsage> Usages { get; } = [];
        public AiBillingSwitch? BillingSwitch { get; set; }

        public Task<AiBillingSwitch?> FindAsync(CancellationToken ct) =>
            Task.FromResult(BillingSwitch);

        public void Add(AiBillingSwitch aiBillingSwitch) => BillingSwitch = aiBillingSwitch;

        public List<Guid> HoldCalls { get; } = [];
        public List<Guid> CaptureCalls { get; } = [];
        public List<Guid> ReleaseCalls { get; } = [];
        public long WalletBalance { get; set; }
        public long WalletHeld { get; set; }
        public bool FailRag { get; set; }
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

        Task<ChatMessage?> IChatMessageRepository.FindForUpdateAsync(
            Guid id,
            CancellationToken ct
        ) => Task.FromResult(Messages.SingleOrDefault(m => m.Id == id));

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

        public Task<IReadOnlyList<AiUsage>> FindByQuestionIdsAsync(
            IReadOnlyCollection<Guid> questionIds,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<AiUsage>>(
                Usages
                    .Where(u => u.QuestionId.HasValue && questionIds.Contains(u.QuestionId.Value))
                    .ToList()
            );

        Task<AiQuota?> IAiQuotaRepository.GetByUserIdAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(Quotas.GetValueOrDefault(userId));

        Task IAiQuotaRepository.AddAsync(AiQuota aiQuota, CancellationToken ct)
        {
            Quotas[aiQuota.UserId] = aiQuota;
            return Task.CompletedTask;
        }

        public Task<bool> TryReserveOneAsync(
            Guid userId,
            int initialBalance,
            DateTimeOffset now,
            CancellationToken ct = default
        )
        {
            if (!Quotas.TryGetValue(userId, out var quota))
            {
                quota = AiQuota.Create(userId, initialBalance, now);
                Quotas[userId] = quota;
            }
            if (!quota.HasAvailableQuota())
                return Task.FromResult(false);
            quota.Deduct(1, now);
            return Task.FromResult(true);
        }

        public Task RefundOneAsync(Guid userId, DateTimeOffset now, CancellationToken ct = default)
        {
            if (Quotas.TryGetValue(userId, out var quota))
                quota.Refund(1, now);
            return Task.CompletedTask;
        }

        public Task<RagQueryResponse> QueryAsync(
            RagQueryRequest request,
            CancellationToken ct = default
        )
        {
            LastRagRequest = request;
            if (FailRag)
            {
                throw WorkflowErrors.RagQueryFailed();
            }

            return Task.FromResult(NextRagResponse);
        }

        public Task HoldAsync(
            Guid userId,
            Guid aiUsageId,
            long amount,
            string? note,
            CancellationToken ct
        )
        {
            if (WalletBalance < amount)
            {
                throw new AppException(
                    ErrorType.Conflict,
                    "INSUFFICIENT_CREDITS",
                    "The wallet balance is not enough."
                );
            }

            WalletBalance -= amount;
            WalletHeld += amount;
            HoldCalls.Add(aiUsageId);
            return Task.CompletedTask;
        }

        public Task CaptureAsync(
            Guid aiUsageId,
            Guid? documentVersionId,
            string? note,
            CancellationToken ct
        )
        {
            WalletHeld = 0;
            CaptureCalls.Add(aiUsageId);
            return Task.CompletedTask;
        }

        public Task ReleaseAsync(Guid aiUsageId, string? note, CancellationToken ct)
        {
            WalletBalance += WalletHeld;
            WalletHeld = 0;
            ReleaseCalls.Add(aiUsageId);
            return Task.CompletedTask;
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
