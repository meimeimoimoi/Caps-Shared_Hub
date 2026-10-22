using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Workflow.Api.Realtime;

/// <summary>Sends CaseMessageCreated to every open connection of the recipients.</summary>
public sealed class SignalRCaseChatNotifier(IHubContext<CaseChatHub> hub) : ICaseChatNotifier
{
    public Task MessageCreatedAsync(
        Guid reviewCaseId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CaseMessageResponse message,
        CancellationToken ct
    ) =>
        hub
            .Clients.Users(recipientUserIds.Select(x => x.ToString()))
            .SendAsync(
                "CaseMessageCreated",
                new { ReviewCaseId = reviewCaseId.ToString(), Message = message },
                ct
            );
}
