using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>A System Admin excuses one violation for force majeure, with a reason.</summary>
public sealed record ExcuseViolationCommand(
    Guid AdminUserId,
    Guid ExpertProfileId,
    Guid ReviewCaseId,
    string? Reason
);

/// <summary>
/// Stops the violation counting. A service already suspended at 9 points stays suspended: the admin reinstates
/// it on the expert page when the remaining points allow.
/// </summary>
public sealed class ExcuseViolationHandler(
    IExpertViolations violations,
    IAuditTrail audit,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ExcuseViolationCommand>
{
    public async Task HandleAsync(ExcuseViolationCommand command, CancellationToken ct)
    {
        var violation =
            await violations.FindAsync(command.ExpertProfileId, command.ReviewCaseId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        var now = clock.GetUtcNow();
        var excused = await violations.CountExcusedAsync(
            command.ExpertProfileId,
            now.AddDays(-ViolationRules.WindowDays),
            ct
        );
        violation.Excuse(command.AdminUserId, command.Reason, excused, now);
        audit.Record(
            AuditActions.Violation,
            violation.ReviewCaseId,
            AuditActions.ViolationExcused,
            command.AdminUserId,
            now,
            new
            {
                expertProfileId = command.ExpertProfileId,
                kind = violation.Kind,
                reason = violation.ExcusedReason,
            }
        );
        await unitOfWork.SaveChangesAsync(ct);
    }
}
