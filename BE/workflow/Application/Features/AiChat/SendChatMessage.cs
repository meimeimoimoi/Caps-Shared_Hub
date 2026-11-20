using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for sending a user question to the AI legal chatbot.</summary>
public static class SendChatMessage
{
    /// <summary>Command to send a question in a conversation with an optional tax period.</summary>
    public sealed record SendChatMessageCommand(
        Guid ConversationId,
        Guid UserId,
        string Content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    /// <summary>Handles quota verification, optional credit hold fallback, RAG query execution, and persistence.</summary>
    public sealed class SendChatMessageHandler(
        IConversationRepository conversationRepository,
        IChatMessageRepository chatMessageRepository,
        IRagQueryClient ragQueryClient,
        AiCreditChargeService aiCreditChargeService,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
    ) : ICommandHandler<SendChatMessageCommand, SendChatMessageResultDto>
    {
        public async Task<SendChatMessageResultDto> HandleAsync(
            SendChatMessageCommand command,
            CancellationToken ct
        )
        {
            var conversation = await conversationRepository.GetByIdAsync(
                command.ConversationId,
                ct
            );
            if (conversation is null)
            {
                throw WorkflowErrors.ConversationNotFound(command.ConversationId);
            }

            if (conversation.UserId != command.UserId)
            {
                throw WorkflowErrors.ConversationAccessDenied();
            }

            var now = timeProvider.GetUtcNow();
            var userMessage = ChatMessage.CreateUserMessage(
                command.ConversationId,
                command.Content,
                command.PeriodStart,
                command.PeriodEnd,
                now
            );
            var ragRequest = new RagQueryRequest(
                command.ConversationId,
                command.Content,
                Clarification: null,
                command.PeriodStart,
                command.PeriodEnd
            );

            return await ChatTurnRunner.RunAsync(
                conversation,
                command.UserId,
                userMessage,
                ragRequest,
                updateTitleWhenNew: true,
                chatMessageRepository,
                ragQueryClient,
                aiCreditChargeService,
                unitOfWork,
                timeProvider,
                ct
            );
        }
    }
}
