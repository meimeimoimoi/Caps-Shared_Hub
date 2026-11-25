using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>Sender role constants for chat messages.</summary>
public static class ChatMessageSender
{
    public const string User = "USER";
    public const string AI = "AI";
}

/// <summary>Answer status constants for AI chat responses.</summary>
public static class ChatMessageAnswerStatus
{
    public const string Answered = "ANSWERED";
    public const string NeedClarification = "NEED_CLARIFICATION";
    public const string Rejected = "REJECTED";
    public const string InsufficientInformation = "INSUFFICIENT_INFORMATION";
}

/// <summary>Closure reason constants when an AI chat question closes as INSUFFICIENT_INFORMATION.</summary>
public static class ChatMessageClosureReason
{
    public const string ClarificationLimitReached = "CLARIFICATION_LIMIT_REACHED";
    public const string UserDidNotClarify = "USER_DID_NOT_CLARIFY";
}

/// <summary>Scope classification constants for AI chat queries.</summary>
public static class ChatMessageScopeResult
{
    public const string InScope = "IN_SCOPE";
    public const string OutOfScope = "OUT_OF_SCOPE";
    public const string Ambiguous = "AMBIGUOUS";
}

/// <summary>A question or AI answer in a conversation, with the legal period it covers and its citations.</summary>
public sealed class ChatMessage
{
    /// <summary>Maximum number of AI clarification prompts allowed per user question (BR-C23).</summary>
    public const int MaxClarificationRounds = 2;

    /// <summary>Duration the user has to answer each clarification request (BR-C22).</summary>
    public static readonly TimeSpan ClarificationWindow = TimeSpan.FromHours(24);

    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = default!;

    public string Sender { get; set; } = default!;
    public string Content { get; set; } = default!;
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public string? ScopeResult { get; set; }
    public string? AnswerStatus { get; set; }
    public string? Citations { get; set; } // jsonb
    public Guid? RootQuestionId { get; set; }
    public int ClarificationRound { get; set; }
    public DateTimeOffset? ClarificationDeadline { get; set; }
    public DateTimeOffset? ClarificationResolvedAt { get; set; }
    public string? ClosureReason { get; set; }
    public string? MissingInformationSummary { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    private ChatMessage() { }

    /// <summary>True while this AI message is an active clarification prompt awaiting user input.</summary>
    public bool IsAwaitingClarification =>
        Sender == ChatMessageSender.AI
        && AnswerStatus == ChatMessageAnswerStatus.NeedClarification
        && ClarificationResolvedAt is null;

    /// <summary>True when this active clarification prompt has reached or passed its 24-hour deadline.</summary>
    public bool IsClarificationOverdue(DateTimeOffset now) =>
        IsAwaitingClarification
        && ClarificationDeadline.HasValue
        && ClarificationDeadline.Value <= now;

    /// <summary>Marks a clarification prompt as resolved so it cannot be clarified again or expired later.</summary>
    public void MarkClarificationResolved(DateTimeOffset now)
    {
        ClarificationResolvedAt ??= now;
    }

    public static ChatMessage CreateUserMessage(
        Guid conversationId,
        string content,
        DateOnly? periodStart,
        DateOnly? periodEnd,
        DateTimeOffset now,
        Guid? rootQuestionId = null
    )
    {
        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Sender = ChatMessageSender.User,
            Content = content,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            ScopeResult = null,
            Citations = null,
            RootQuestionId = rootQuestionId,
            ClarificationRound = 0,
            CreatedAt = now,
        };
    }

    public static ChatMessage CreateAiMessage(
        Guid conversationId,
        string content,
        string scopeResult,
        string answerStatus,
        DateOnly? periodStart,
        DateOnly? periodEnd,
        string? citations,
        DateTimeOffset now,
        int clarificationRound = 0,
        DateTimeOffset? clarificationDeadline = null,
        Guid? rootQuestionId = null,
        string? closureReason = null,
        string? missingInformationSummary = null
    )
    {
        var isClarification = answerStatus == ChatMessageAnswerStatus.NeedClarification;
        var resolvedRound = isClarification
            ? Math.Max(clarificationRound, 1)
            : Math.Max(clarificationRound, 0);
        var resolvedDeadline = isClarification
            ? clarificationDeadline ?? now.Add(ClarificationWindow)
            : clarificationDeadline;

        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Sender = ChatMessageSender.AI,
            Content = content,
            ScopeResult = scopeResult,
            AnswerStatus = answerStatus,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Citations = citations,
            RootQuestionId = rootQuestionId,
            ClarificationRound = resolvedRound,
            ClarificationDeadline = resolvedDeadline,
            ClosureReason = closureReason,
            MissingInformationSummary = missingInformationSummary,
            CreatedAt = now,
        };
    }

    /// <summary>Builds a concise summary of material information still missing before closing the question.</summary>
    public static string BuildMissingInformationSummary(
        string? originalQuestion,
        IReadOnlyList<string> clarificationPrompts,
        IReadOnlyList<string> userClarifications,
        string? latestMissingPrompt = null
    )
    {
        var prompts = clarificationPrompts
            .Concat(latestMissingPrompt is not null ? [latestMissingPrompt] : [])
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(originalQuestion))
        {
            parts.Add($"Câu hỏi gốc: {originalQuestion.Trim()}");
        }

        if (prompts.Count > 0)
        {
            parts.Add(
                "Thông tin trọng yếu còn thiếu theo các yêu cầu làm rõ: "
                    + string.Join(" | ", prompts)
            );
        }
        else
        {
            parts.Add(
                "Thông tin trọng yếu còn thiếu: kỳ tính thuế áp dụng và các dữ kiện giao dịch liên quan đến thuế TNDN."
            );
        }

        if (userClarifications.Count > 0)
        {
            var provided = userClarifications
                .Select(c => c.Trim())
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToList();
            if (provided.Count > 0)
            {
                parts.Add("Thông tin người dùng đã bổ sung: " + string.Join(" ; ", provided));
            }
        }

        return string.Join("\n", parts);
    }

    /// <summary>
    /// Creates a closing AI message with status INSUFFICIENT_INFORMATION without drawing any definitive CIT conclusion.
    /// </summary>
    public static ChatMessage CreateInsufficientInformationMessage(
        Guid conversationId,
        Guid? rootQuestionId,
        int clarificationRound,
        string closureReason,
        string missingInformationSummary,
        DateOnly? periodStart,
        DateOnly? periodEnd,
        DateTimeOffset now
    )
    {
        var header =
            closureReason == ChatMessageClosureReason.ClarificationLimitReached
                ? $"Câu hỏi đã được đóng với trạng thái thiếu thông tin do đã đạt giới hạn tối đa {MaxClarificationRounds} vòng hỏi lại mà vẫn chưa đủ dữ kiện trọng yếu."
                : "Câu hỏi đã được đóng với trạng thái thiếu thông tin do quá thời hạn 24 giờ phản hồi yêu cầu làm rõ.";

        var content =
            $"{header}\n\n"
            + $"Tóm tắt thông tin còn thiếu:\n{missingInformationSummary}\n\n"
            + "Lưu ý: Do chưa đủ dữ kiện trọng yếu, AI không đưa ra kết luận chắc chắn về nghĩa vụ thuế TNDN. "
            + "Bạn vui lòng gửi câu hỏi mới kèm đầy đủ kỳ tính thuế và thông tin liên quan, hoặc liên hệ Chuyên gia để được tư vấn trực tiếp.";

        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Sender = ChatMessageSender.AI,
            Content = content,
            ScopeResult = ChatMessageScopeResult.InScope,
            AnswerStatus = ChatMessageAnswerStatus.InsufficientInformation,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Citations = null,
            RootQuestionId = rootQuestionId,
            ClarificationRound = Math.Max(clarificationRound, 1),
            ClarificationDeadline = null,
            ClosureReason = closureReason,
            MissingInformationSummary = missingInformationSummary,
            CreatedAt = now,
        };
    }
}
