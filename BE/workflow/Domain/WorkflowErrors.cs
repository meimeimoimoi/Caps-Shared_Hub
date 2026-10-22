using Caps.Common.Domain;

namespace Caps.Workflow.Domain;

/// <summary>Business error codes of the workflow service; the FE relies on these codes.</summary>
public static class WorkflowErrors
{
    public static AppException ReviewCaseNotFound() =>
        new(ErrorType.NotFound, "REVIEW_CASE_NOT_FOUND", "Review case not found.");

    public static AppException ChatClosed(string status) =>
        new(
            ErrorType.Conflict,
            "CHAT_CLOSED",
            $"Messages cannot be sent while the case is {status}."
        );

    public static AppException MessageEmpty() =>
        new(ErrorType.Validation, "MESSAGE_EMPTY", "Message must not be empty.");

    public static AppException MessageTooLong(int max) =>
        new(ErrorType.Validation, "MESSAGE_TOO_LONG", $"Message must be at most {max} characters.");

    public static AppException MessageNotFound() =>
        new(ErrorType.NotFound, "MESSAGE_NOT_FOUND", "Message not found in this case.");
}
