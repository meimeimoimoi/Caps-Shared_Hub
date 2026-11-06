using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;
public class CreateConversation
{
    public sealed record CreateConverstaionCommand(
        Guid UserId,
        string? Titile
        );

    public sealed class CreateCoversationHandler(
        IConversationRepository conversationRepository,
        IUnitOfWork unitWork,
        TimeProvider timeProvider) : ICommandHandler<CreateConverstaionCommand, ConversationDetailDto>
    {
        public async Task<ConversationDetailDto> HandleAsync(CreateConverstaionCommand command, CancellationToken ct)
        {
            var now = timeProvider.GetUtcNow();
            var conversation = Conversation.Create(command.UserId, command.Titile, now);

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
