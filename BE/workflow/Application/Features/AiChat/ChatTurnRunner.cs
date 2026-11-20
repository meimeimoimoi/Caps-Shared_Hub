using System.Text.Json;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Executes one RAG chat turn with quota/credit reservation and atomic settlement.</summary>
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
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider,
        CancellationToken ct
    )
    {
        var now = timeProvider.GetUtcNow();
        var note = $"AI chat question in conversation {conversation.Id}";
        var reservation = await aiCreditChargeService.ReserveAsync(
            userId,
            AiChargeKind.Chat,
            note,
            now,
            ct
        );

        try
        {
            var ragResponse = await ragQueryClient.QueryAsync(ragRequest, ct);

            var citationsJson =
                ragResponse.Citations.Count > 0
                    ? JsonSerializer.Serialize(ragResponse.Citations)
                    : null;

            var settledAt = timeProvider.GetUtcNow();
            var aiMessage = ChatMessage.CreateAiMessage(
                conversation.Id,
                ragResponse.Content,
                ragResponse.ScopeResult,
                ragResponse.AnswerStatus,
                ragResponse.PeriodStart ?? ragRequest.PeriodStart,
                ragResponse.PeriodEnd ?? ragRequest.PeriodEnd,
                citationsJson,
                settledAt
            );

            await using var tx = await unitOfWork.BeginTransactionAsync(ct);
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

            if (ragResponse.AnswerStatus == ChatMessageAnswerStatus.Answered)
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
                await unitOfWork.SaveChangesAsync(ct);
                await aiCreditChargeService.ReleaseHeldCreditAsync(
                    reservation,
                    $"AI chat {ragResponse.AnswerStatus}",
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
                userMessage.CreatedAt
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
                ragResponse.Citations,
                aiMessage.CreatedAt
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
