using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>
/// A client's complaint about a delivered review, decided by a system admin; at most one per case. The decision
/// window is a target the admin dashboard warns about, never an automatic decision.
/// </summary>
public sealed class ReviewDispute
{
    public const string Open = "OPEN";
    public const string Resolved = "RESOLVED";
    public const string Withdrawn = "WITHDRAWN";
    public static readonly TimeSpan DecisionWindow = TimeSpan.FromHours(48);

    /// <summary>Why the client complains: the same codes as the FE dispute form.</summary>
    public static readonly string[] Reasons =
    [
        "DELIVERABLE_INCOMPLETE",
        "SLA_BREACH",
        "OBLIGATION_NOT_MET",
        "PROFESSIONAL_JUDGMENT",
    ];

    private ReviewDispute() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public string Reason { get; private set; } = default!;
    public string Description { get; private set; } = default!;
    public string Status { get; private set; } = Open;
    public DateTimeOffset OpenedAt { get; private set; }

    /// <summary>When the admin should have decided; extended once by another window.</summary>
    public DateTimeOffset DecideBy { get; private set; }
    public bool Extended { get; private set; }
    public string? ExpertStatement { get; private set; }
    public DateTimeOffset? ExpertStatementAt { get; private set; }
    public Guid? ResolvedBy { get; private set; }

    /// <summary>Share of the fee returned to the client, set by the admin.</summary>
    public short? RefundPct { get; private set; }
    public string? ResolutionNote { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }

    // Only ReviewCase opens and closes disputes, so the case status always matches
    internal static ReviewDispute Create(
        Guid reviewCaseId,
        string reason,
        string description,
        DateTimeOffset now
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            Reason = reason,
            Description = description,
            OpenedAt = now,
            DecideBy = now + DecisionWindow,
        };

    /// <summary>The admin needs more time: one more decision window, once.</summary>
    public void Extend()
    {
        EnsureOpen();
        if (Extended)
        {
            throw WorkflowErrors.DisputeAlreadyExtended();
        }
        Extended = true;
        DecideBy += DecisionWindow;
    }

    internal void AddStatement(string statement, DateTimeOffset now)
    {
        EnsureOpen();
        if (ExpertStatement is not null)
        {
            throw WorkflowErrors.DisputeStatementExists();
        }
        ExpertStatement = statement;
        ExpertStatementAt = now;
    }

    internal void Resolve(Guid adminUserId, short refundPct, string note, DateTimeOffset now)
    {
        EnsureOpen();
        ResolvedBy = adminUserId;
        RefundPct = refundPct;
        ResolutionNote = note;
        Status = Resolved;
        ClosedAt = now;
    }

    internal void Withdraw(DateTimeOffset now)
    {
        EnsureOpen();
        Status = Withdrawn;
        ClosedAt = now;
    }

    private void EnsureOpen()
    {
        if (Status != Open)
        {
            throw WorkflowErrors.CaseStatusInvalid(Status);
        }
    }
}
