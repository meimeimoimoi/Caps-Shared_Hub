using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.AiChat.Commands;

/// <summary>Command tạo cuộc hội thoại mới.</summary>
public sealed record CreateConversationCommand(Guid UserId, string? Title);

/// <summary>Handler xử lý lưu Conversation qua repository.</summary>
public sealed class CreateConversationCommandHandler(
    IConversationRepository conversations,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<CreateConversationCommand, ConversationDto>
{
    public async Task<ConversationDto> HandleAsync(
        CreateConversationCommand command,
        CancellationToken ct = default
    )
    {
        var now = clock.GetUtcNow();

        var conversation = new Conversation
        {
            Id = Guid.CreateVersion7(),
            UserId = command.UserId,
            Title = string.IsNullOrWhiteSpace(command.Title) ? "Cuộc trò chuyện mới" : command.Title.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        conversations.Add(conversation);
        await unitOfWork.SaveChangesAsync(ct);

        return new ConversationDto(
            conversation.Id,
            conversation.Title,
            conversation.CreatedAt,
            conversation.UpdatedAt
        );
    }
}
