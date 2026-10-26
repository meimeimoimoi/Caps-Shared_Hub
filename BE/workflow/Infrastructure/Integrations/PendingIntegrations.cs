using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Infrastructure.Integrations;

// placeholders so the service starts; replaced by HTTP adapters once the team settles
// how workflow calls expert and billing (step 5)

/// <summary>Answers 503 until the expert service adapter exists.</summary>
public sealed class PendingExpertOfferings : IExpertOfferings
{
    public Task<ReviewOffer?> FindAsync(
        Guid expertProfileId,
        string serviceCode,
        CancellationToken ct
    ) => throw WorkflowErrors.ServiceLinkUnavailable("expert");
}

/// <summary>Answers 503 until the billing service adapter exists.</summary>
public sealed class PendingEscrows : IEscrows
{
    public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
        throw WorkflowErrors.ServiceLinkUnavailable("billing");

    public Task RefundAsync(Guid reviewCaseId, CancellationToken ct) =>
        throw WorkflowErrors.ServiceLinkUnavailable("billing");

    public Task ReleaseAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        int platformFeePct,
        CancellationToken ct
    ) => throw WorkflowErrors.ServiceLinkUnavailable("billing");
}
