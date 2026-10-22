using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.CaseChat;

/// <summary>Unread message counts of the signed-in user, per case.</summary>
public sealed record GetUnreadCaseMessagesQuery(Guid UserId);

/// <summary>Counts, per case the user takes part in, the other party's messages after the user's read marker.</summary>
public sealed class GetUnreadCaseMessagesHandler(ICaseMessageRepository messages)
    : IQueryHandler<GetUnreadCaseMessagesQuery, CaseUnreadResponse[]>
{
    public async Task<CaseUnreadResponse[]> HandleAsync(
        GetUnreadCaseMessagesQuery query,
        CancellationToken ct
    )
    {
        var counts = await messages.CountUnreadAsync(query.UserId, ct);
        return [.. counts.Select(x => new CaseUnreadResponse(x.Key.ToString(), x.Value))];
    }
}
