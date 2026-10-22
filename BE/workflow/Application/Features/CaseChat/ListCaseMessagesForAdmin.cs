using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.CaseChat;

/// <summary>A page of a case's messages for an administrator handling a dispute.</summary>
public sealed record ListCaseMessagesForAdminQuery(
    Guid ReviewCaseId,
    Guid? Before,
    Guid? After,
    int? Limit
);

/// <summary>Lists any case's messages, read-only; access is decided by the admin permission.</summary>
public sealed class ListCaseMessagesForAdminHandler(
    IReviewCaseRepository cases,
    ICaseMessageRepository messages
) : IQueryHandler<ListCaseMessagesForAdminQuery, CaseMessageResponse[]>
{
    public async Task<CaseMessageResponse[]> HandleAsync(
        ListCaseMessagesForAdminQuery query,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
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
