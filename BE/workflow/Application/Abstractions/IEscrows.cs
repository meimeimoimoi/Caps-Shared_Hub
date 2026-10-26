namespace Caps.Workflow.Application.Abstractions;

/// <summary>The billing escrow that holds the client's payment for a review case.</summary>
public interface IEscrows
{
    /// <summary>Holds the case fee from the client's credits; fails when the balance is too low.</summary>
    Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct);

    /// <summary>Returns the held fee to the client (declined or expired case).</summary>
    Task RefundAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Pays the held fee to the expert minus the platform fee (accepted case).</summary>
    Task ReleaseAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        int platformFeePct,
        CancellationToken ct
    );
}
