using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for starting a new AI legal chat conversation.</summary>
public static class CreateConversation
{
    /// <summary>Command to create a new conversation for a user.</summary>
    public sealed record CreateConversationCommand(
        Guid UserId,
        string? Title
    );

    /// <summary>Handles creating and persisting a new AI chat conversation.</summary>
    public sealed class CreateConversationHandler(
        IConversationRepository conversationRepository,
        IUnitOfWork unitWork,
        TimeProvider timeProvider
    ) : ICommandHandler<CreateConversationCommand, ConversationDetailDto>
    {
        public async Task<ConversationDetailDto> HandleAsync(CreateConversationCommand command, CancellationToken ct)
        {
            var now = timeProvider.GetUtcNow();
            var conversation = Conversation.Create(command.UserId, command.Title, now);

            await conversationRepository.AddAsync(conversation, ct);
            await unitWork.SaveChangesAsync(ct);

            return new ConversationDetailDto(
                conversation.Id,
                conversation.Title,
                conversation.CreatedAt,
                conversation.UpdatedAt
            );
        }
    }
}
