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

    /// <summary>Working days the admin has to decide; the one extension adds the same again.</summary>
    public const int WorkingDaysToDecide = 2;

    /// <summary>Working days the expert has, from the opening, to explain; the admin waits for it (2026-11-22).</summary>
    public const int WorkingDaysToRespond = 1;

    /// <summary>
    /// Why the client complains: the same codes as the FE dispute form. No code for a late delivery: the late
    /// rule frozen on the case already refunds it, so a complaint about it would pay the client twice.
    /// </summary>
    public static readonly string[] Reasons =
    [
        "DELIVERABLE_INCOMPLETE",
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

    /// <summary>Who extended the deadline, when and why; null until extended.</summary>
    public Guid? ExtendedBy { get; private set; }
    public DateTimeOffset? ExtendedAt { get; private set; }
    public string? ExtensionReason { get; private set; }

    /// <summary>Set by the expiry job when it alerts the operations inbox; cleared by an extension.</summary>
    public DateTimeOffset? OverdueAlertedAt { get; private set; }
    public string? ExpertStatement { get; private set; }
    public DateTimeOffset? ExpertStatementAt { get; private set; }

    /// <summary>The expert explains before then; until then the admin cannot decide without the statement.</summary>
    public DateTimeOffset StatementDueBy { get; private set; }

    /// <summary>Set by the expiry job when it reminds the expert to explain.</summary>
    public DateTimeOffset? StatementReminderSentAt { get; private set; }
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
        DateTimeOffset now,
        WorkCalendar calendar
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            Reason = reason,
            Description = description,
            OpenedAt = now,
            DecideBy = calendar.AddWorkingDays(now, WorkingDaysToDecide),
            StatementDueBy = calendar.AddWorkingDays(now, WorkingDaysToRespond),
        };

    /// <summary>Shortest reason an admin must give for extending, like the other admin actions.</summary>
    public const int MinExtensionReasonLength = 10;

    /// <summary>
    /// The admin needs more time: one more decision window, once, with a reason; also allowed after the deadline
    /// passed. Who, when and why are kept so the extension can be audited.
    /// </summary>
    public void Extend(
        Guid adminUserId,
        string? reason,
        DateTimeOffset now,
        WorkCalendar? calendar = null
    )
    {
        EnsureOpen();
        if (Extended)
        {
            throw WorkflowErrors.DisputeAlreadyExtended();
        }
        var why = reason?.Trim() ?? "";
        if (why.Length < MinExtensionReasonLength)
        {
            throw WorkflowErrors.DisputeExtensionReasonRequired(MinExtensionReasonLength);
        }
        Extended = true;
        ExtendedBy = adminUserId;
        ExtendedAt = now;
        ExtensionReason = why;
        DecideBy = (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(
            DecideBy,
            WorkingDaysToDecide
        );
        OverdueAlertedAt = null;
    }

    /// <summary>
    /// Both parties add evidence while the statement window is open; an extension reopens it until the new
    /// decision deadline, since the admin extends to wait for more evidence.
    /// </summary>
    public bool EvidenceOpen(DateTimeOffset now) => now < (Extended ? DecideBy : StatementDueBy);

    internal void AddStatement(string statement, DateTimeOffset now)
    {
        EnsureOpen();
        if (ExpertStatement is not null)
        {
            throw WorkflowErrors.DisputeStatementExists();
        }
        if (now >= StatementDueBy)
        {
            throw WorkflowErrors.DisputeStatementClosed();
        }
        ExpertStatement = statement;
        ExpertStatementAt = now;
    }

    /// <summary>The admin may decide once the expert explained or the statement window ended.</summary>
    internal void EnsureDecidable(DateTimeOffset now)
    {
        if (ExpertStatement is null && now < StatementDueBy)
        {
            throw WorkflowErrors.DisputeAwaitingStatement(StatementDueBy);
        }
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
