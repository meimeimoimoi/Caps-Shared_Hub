using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>A System Admin turns down the expert's excuse request.</summary>
public sealed record DeclineExcuseCommand(
    Guid AdminUserId,
    Guid ExpertProfileId,
    Guid ReviewCaseId
);

/// <summary>The violation keeps counting; the decision is audited.</summary>
public sealed class DeclineExcuseHandler(
    IExpertViolations violations,
    IAuditTrail audit,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<DeclineExcuseCommand>
{
    public async Task HandleAsync(DeclineExcuseCommand command, CancellationToken ct)
    {
        var violation =
            await violations.FindAsync(command.ExpertProfileId, command.ReviewCaseId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        var now = clock.GetUtcNow();
        violation.DeclineExcuse(now);
        audit.Record(
            AuditActions.Violation,
            violation.ReviewCaseId,
            AuditActions.ViolationExcuseDeclined,
            command.AdminUserId,
            now,
            new { expertProfileId = command.ExpertProfileId, request = violation.ExcuseRequest }
        );
        await unitOfWork.SaveChangesAsync(ct);
    }
}
