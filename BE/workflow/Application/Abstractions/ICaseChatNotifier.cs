using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Pushes new case messages to the parties' open connections.</summary>
public interface ICaseChatNotifier
{
    Task MessageCreatedAsync(
        Guid reviewCaseId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CaseMessageResponse message,
        CancellationToken ct
    );
}
