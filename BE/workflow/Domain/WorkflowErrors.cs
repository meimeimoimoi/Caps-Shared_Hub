using Caps.Common.Domain;

namespace Caps.Workflow.Domain;

/// <summary>Business error codes of the workflow service; the FE relies on these codes.</summary>
public static class WorkflowErrors
{
    public static AppException ReviewCaseNotFound() =>
        new(ErrorType.NotFound, "REVIEW_CASE_NOT_FOUND", "Review case not found.");

    public static AppException CaseStatusInvalid(string status) =>
        new(
            ErrorType.Conflict,
            "CASE_STATUS_INVALID",
            $"This action is not allowed while the case is {status}."
        );

    public static AppException DeadlinePassed() =>
        new(ErrorType.Conflict, "CASE_DEADLINE_PASSED", "The deadline for this step has passed.");

    public static AppException OfferInvalid() =>
        new(
            ErrorType.RuleViolation,
            "CASE_OFFER_INVALID",
            "The expert's price or turnaround for this service is not valid."
        );

    public static AppException TextRequired(string field, int max) =>
        new(
            ErrorType.Validation,
            "TEXT_REQUIRED",
            $"{field} is required and must be at most {max} characters."
        );

    public static AppException TextTooLong(string field, int max) =>
        new(ErrorType.Validation, "TEXT_TOO_LONG", $"{field} must be at most {max} characters.");

    public static AppException ResultInvalid() =>
        new(
            ErrorType.Validation,
            "REVIEW_RESULT_INVALID",
            "Result must be VERIFIED or CANNOT_VERIFY."
        );

    public static AppException InfoRequestClosed() =>
        new(
            ErrorType.Conflict,
            "INFO_REQUEST_CLOSED",
            "This information request is already answered or expired."
        );

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
