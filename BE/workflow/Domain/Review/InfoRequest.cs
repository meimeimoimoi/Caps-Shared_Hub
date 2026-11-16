using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>A question the expert asks the requester during a review, answered before a deadline.</summary>
public sealed class InfoRequest
{
    public const string Open = "OPEN";
    public const string Answered = "ANSWERED";
    public const string Expired = "EXPIRED";

    private InfoRequest() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public ReviewCase ReviewCase { get; } = default!;

    public Guid RequestedBy { get; private set; }
    public string Message { get; private set; } = default!;
    public DateTimeOffset DueAt { get; private set; }
    public string? ResponseMessage { get; private set; }
    public DateTimeOffset? RespondedAt { get; private set; }
    public string Status { get; private set; } = Open;
    public DateTimeOffset CreatedAt { get; private set; }

    public ICollection<ReviewAttachment> Attachments { get; } = [];

    // Only ReviewCase opens and closes requests, so the case status always matches
    internal static InfoRequest Create(
        Guid reviewCaseId,
        Guid requestedBy,
        string message,
        DateTimeOffset dueAt,
        DateTimeOffset now
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            RequestedBy = requestedBy,
            Message = message,
            DueAt = dueAt,
            CreatedAt = now,
        };

    internal void Answer(string message, DateTimeOffset now)
    {
        if (Status != Open)
        {
            throw WorkflowErrors.InfoRequestClosed();
        }
        if (now >= DueAt)
        {
            throw WorkflowErrors.DeadlinePassed();
        }
        ResponseMessage = message;
        RespondedAt = now;
        Status = Answered;
    }

    /// <summary>Closes the request once its deadline passed; false when not overdue (safe to call twice).</summary>
    internal bool Expire(DateTimeOffset now)
    {
        if (Status != Open || now < DueAt)
        {
            return false;
        }
        Status = Expired;
        return true;
    }
}
