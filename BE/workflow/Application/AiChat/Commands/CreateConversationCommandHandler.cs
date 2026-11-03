using Caps.Common.Application;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.AiChat.Commands;
public sealed record CreateConversationCommand(string? Title) : IRequest<ConversationDto>;
internal class CreateConversationCommandHandler
{
}
