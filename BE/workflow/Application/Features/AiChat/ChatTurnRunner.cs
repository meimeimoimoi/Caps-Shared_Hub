using System.Text.Json;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Executes one RAG chat turn with quota/credit reservation, clarification rules, and atomic settlement.</summary>
internal static class ChatTurnRunner
{
    public static async Task<SendChatMessageResultDto> RunAsync(
        Conversation conversation,
        Guid userId,
        ChatMessage userMessage,
        RagQueryRequest ragRequest,
        bool updateTitleWhenNew,
        IChatMessageRepository chatMessageRepository,
        IRagQueryClient ragQueryClient,
        AiCreditChargeService aiCreditChargeService,
        AiBillingSettings aiBillingSettings,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider,
        CancellationToken ct,
        ChatMessage? clarifiedTarget = null,
        Guid? rootQuestionId = null,
        IReadOnlyList<string>? priorClarificationPrompts = null,
        IReadOnlyList<string>? priorUserClarifications = null,
        IReadOnlyCollection<Guid>? threadQuestionIds = null
    )
    {
        var now = timeProvider.GetUtcNow();
        var note = $"AI chat question in conversation {conversation.Id}";
        var reservation = await aiCreditChargeService.ReserveAsync(
            userId,
            aiBillingSettings.ChatCreditCost,
            note,
            now,
            ct,
            allowFreeQuota: true
        );

        try
        {
            var ragResponse = await ragQueryClient.QueryAsync(ragRequest, ct);

            var settledAt = timeProvider.GetUtcNow();
            var effectiveRootId = rootQuestionId ?? userMessage.Id;
            var effectivePeriodStart = ragResponse.PeriodStart ?? ragRequest.PeriodStart;
            var effectivePeriodEnd = ragResponse.PeriodEnd ?? ragRequest.PeriodEnd;

            ChatMessage aiMessage;
            IReadOnlyList<CitationDto>? responseCitations = ragResponse.Citations;

            if (ragResponse.AnswerStatus == ChatMessageAnswerStatus.NeedClarification)
            {
                var nextRound = clarifiedTarget is null
                    ? 1
                    : Math.Max(clarifiedTarget.ClarificationRound, 1) + 1;

                if (nextRound > ChatMessage.MaxClarificationRounds)
                {
                    var missingSummary = ChatMessage.BuildMissingInformationSummary(
                        ragRequest.Query,
                        priorClarificationPrompts ?? [],
                        priorUserClarifications ?? [],
                        ragResponse.Content
                    );
                    aiMessage = ChatMessage.CreateInsufficientInformationMessage(
                        conversation.Id,
                        effectiveRootId,
                        ChatMessage.MaxClarificationRounds,
                        ChatMessageClosureReason.ClarificationLimitReached,
                        missingSummary,
                        effectivePeriodStart,
                        effectivePeriodEnd,
                        settledAt
                    );
                    responseCitations = [];
                }
                else
                {
                    aiMessage = ChatMessage.CreateAiMessage(
                        conversation.Id,
                        ragResponse.Content,
                        ragResponse.ScopeResult,
                        ChatMessageAnswerStatus.NeedClarification,
                        effectivePeriodStart,
                        effectivePeriodEnd,
                        citations: null,
                        settledAt,
                        clarificationRound: nextRound,
                        clarificationDeadline: settledAt.Add(ChatMessage.ClarificationWindow),
                        rootQuestionId: effectiveRootId
                    );
                    responseCitations = [];
                }
            }
            else
            {
                var citationsJson =
                    ragResponse.Citations.Count > 0
                        ? JsonSerializer.Serialize(ragResponse.Citations)
                        : null;
                var completedRound = clarifiedTarget is null
                    ? 0
                    : Math.Max(clarifiedTarget.ClarificationRound, 1);

                aiMessage = ChatMessage.CreateAiMessage(
                    conversation.Id,
                    ragResponse.Content,
                    ragResponse.ScopeResult,
                    ragResponse.AnswerStatus,
                    effectivePeriodStart,
                    effectivePeriodEnd,
                    citationsJson,
                    settledAt,
                    clarificationRound: completedRound,
                    clarificationDeadline: null,
                    rootQuestionId: effectiveRootId
                );
            }

            await using var tx = await unitOfWork.BeginTransactionAsync(ct);
            clarifiedTarget?.MarkClarificationResolved(settledAt);
            await chatMessageRepository.AddAsync(userMessage, ct);
            await chatMessageRepository.AddAsync(aiMessage, ct);

            if (updateTitleWhenNew && conversation.Title == "New Conversation")
            {
                var autoTitle =
                    userMessage.Content.Length > 60
                        ? userMessage.Content[..57] + "..."
                        : userMessage.Content;
                conversation.UpdateTitle(autoTitle, settledAt);
            }
            else
            {
                conversation.Touch(settledAt);
            }

            if (aiMessage.AnswerStatus == ChatMessageAnswerStatus.Answered)
            {
                await aiCreditChargeService.RecordCapturedUsageAsync(
                    reservation,
                    userId,
                    conversation.Id,
                    userMessage.Id,
                    settledAt,
                    ct
                );
                await unitOfWork.SaveChangesAsync(ct);
                await aiCreditChargeService.CaptureHeldCreditAsync(
                    reservation,
                    documentVersionId: null,
                    note,
                    ct
                );
            }
            else
            {
                await aiCreditChargeService.RecordRefundedCreditUsageAsync(
                    reservation,
                    userId,
                    conversation.Id,
                    userMessage.Id,
                    settledAt,
                    ct
                );
                if (
                    aiMessage.AnswerStatus == ChatMessageAnswerStatus.InsufficientInformation
                    && threadQuestionIds is { Count: > 0 }
                )
                {
                    await aiCreditChargeService.ReleaseReservedUsagesForQuestionAsync(
                        threadQuestionIds,
                        $"AI chat {aiMessage.AnswerStatus} ({aiMessage.ClosureReason})",
                        settledAt,
                        ct
                    );
                }

                await unitOfWork.SaveChangesAsync(ct);
                await aiCreditChargeService.ReleaseHeldCreditAsync(
                    reservation,
                    $"AI chat {aiMessage.AnswerStatus}",
                    ct
                );
            }

            await tx.CommitAsync(ct);

            var userDto = new ChatMessageDto(
                userMessage.Id,
                userMessage.ConversationId,
                userMessage.Sender,
                userMessage.Content,
                userMessage.PeriodStart,
                userMessage.PeriodEnd,
                null,
                null,
                null,
                userMessage.CreatedAt,
                userMessage.ClarificationRound,
                userMessage.ClarificationDeadline,
                userMessage.ClosureReason,
                userMessage.MissingInformationSummary
            );

            var aiDto = new ChatMessageDto(
                aiMessage.Id,
                aiMessage.ConversationId,
                aiMessage.Sender,
                aiMessage.Content,
                aiMessage.PeriodStart,
                aiMessage.PeriodEnd,
                aiMessage.ScopeResult,
                aiMessage.AnswerStatus,
                responseCitations,
                aiMessage.CreatedAt,
                aiMessage.ClarificationRound,
                aiMessage.ClarificationDeadline,
                aiMessage.ClosureReason,
                aiMessage.MissingInformationSummary
            );

            return new SendChatMessageResultDto(userDto, aiDto);
        }
        catch
        {
            await aiCreditChargeService.ReleaseOnErrorAsync(reservation, "AI chat failed");
            throw;
        }
    }
}
