using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Tells other services about review case steps (notifications); never fails the caller.</summary>
public interface IReviewCaseEvents
{
    /// <summary>The case was paid and now waits for the expert.</summary>
    Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct);

    /// <summary>The expert asked the client for information; the client is told and emailed.</summary>
    Task InfoRequestedAsync(ReviewCase reviewCase, InfoRequest request, CancellationToken ct);

    /// <summary>The case moved to another status; called after the step is committed.</summary>
    Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    );

    /// <summary>A waiting request is close to its response deadline; called once per case.</summary>
    Task ResponseDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset responseDeadline,
        CancellationToken ct
    );

    /// <summary>A delivered result is close to its acceptance deadline; called once per delivery.</summary>
    Task AcceptanceDueAsync(
        Guid reviewCaseId,
        Guid requesterUserId,
        string? requesterEmail,
        DateTimeOffset acceptanceDeadline,
        CancellationToken ct
    ) => Task.CompletedTask;

    /// <summary>The expert asked the client for more working days; the client is told and emailed.</summary>
    Task ExtensionRequestedAsync(ReviewCase reviewCase, CancellationToken ct) => Task.CompletedTask;

    /// <summary>The client answered the expert's extension request; the expert is told.</summary>
    Task ExtensionDecidedAsync(ReviewCase reviewCase, CancellationToken ct) => Task.CompletedTask;

    /// <summary>An open dispute passed its decision deadline; called once per deadline.</summary>
    Task DisputeOverdueAsync(
        Guid reviewCaseId,
        DateTimeOffset decideBy,
        bool extended,
        CancellationToken ct
    );
}
