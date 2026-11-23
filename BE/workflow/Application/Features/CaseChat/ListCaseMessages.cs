using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.CaseChat;

/// <summary>A page of a case's messages for one of its parties; the cursors are message ids.</summary>
public sealed record ListCaseMessagesQuery(
    Guid UserId,
    Guid ReviewCaseId,
    Guid? Before,
    Guid? After,
    int? Limit
);

/// <summary>Lists a case's messages after checking the caller is a party of the case.</summary>
public sealed class ListCaseMessagesHandler(
    IReviewCaseRepository cases,
    ICaseMessageRepository messages
) : IQueryHandler<ListCaseMessagesQuery, CaseMessageResponse[]>
{
    public async Task<CaseMessageResponse[]> HandleAsync(
        ListCaseMessagesQuery query,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.ParticipantRoleOf(query.UserId);
        return await CaseMessagePage.LoadAsync(
            messages,
            reviewCase.Id,
            query.Before,
            query.After,
            query.Limit,
            ct
        );
    }
}

/// <summary>Turns message-id cursors into a page of messages, oldest first.</summary>
internal static class CaseMessagePage
{
    public const int DefaultLimit = 30;
    public const int MaxLimit = 100;

    public static async Task<CaseMessageResponse[]> LoadAsync(
        ICaseMessageRepository messages,
        Guid reviewCaseId,
        Guid? before,
        Guid? after,
        int? limit,
        CancellationToken ct
    )
    {
        var beforeAt = await CursorAsync(messages, reviewCaseId, before, ct);
        var afterAt = await CursorAsync(messages, reviewCaseId, after, ct);
        var size = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var page = await messages.ListAsync(reviewCaseId, beforeAt, afterAt, size, ct);
        return [.. page.Select(CaseMessageResponse.From)];
    }

    private static async Task<DateTimeOffset?> CursorAsync(
        ICaseMessageRepository messages,
        Guid reviewCaseId,
        Guid? messageId,
        CancellationToken ct
    )
    {
        if (messageId is not { } id)
            return null;
        var message =
            await messages.FindAsync(reviewCaseId, id, ct)
            ?? throw WorkflowErrors.MessageNotFound();
        return message.CreatedAt;
    }
}
