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

    public static AppException CaseAlreadyOpen() =>
        new(
            ErrorType.Conflict,
            "REVIEW_CASE_ALREADY_OPEN",
            "This document version already has an open review with this expert."
        );

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

    public static AppException InfoRequestLimit(int max) =>
        new(
            ErrorType.Conflict,
            "INFO_REQUEST_LIMIT",
            $"The expert may ask for more information at most {max} times per case."
        );

    public static AppException DisputeReasonInvalid() =>
        new(
            ErrorType.Validation,
            "DISPUTE_REASON_INVALID",
            "Choose one of the listed dispute reasons."
        );

    public static AppException DisputeStatementExists() =>
        new(
            ErrorType.Conflict,
            "DISPUTE_STATEMENT_EXISTS",
            "The expert has already explained this dispute."
        );

    public static AppException DisputeAlreadyExtended() =>
        new(
            ErrorType.Conflict,
            "DISPUTE_ALREADY_EXTENDED",
            "The decision window was already extended once."
        );

    public static AppException DisputeRefundInvalid() =>
        new(
            ErrorType.Validation,
            "DISPUTE_REFUND_INVALID",
            "The refund must be between 0 and 100 percent."
        );

    public static AppException DisputeNotFound() =>
        new(ErrorType.NotFound, "DISPUTE_NOT_FOUND", "This case has no dispute.");

    public static AppException DocumentNotFound() =>
        new(ErrorType.NotFound, "DOCUMENT_NOT_FOUND", "Document version not found.");

    public static AppException ExpertServiceUnavailable() =>
        new(
            ErrorType.NotFound,
            "EXPERT_SERVICE_UNAVAILABLE",
            "This expert does not offer this service right now."
        );

    public static AppException ServiceLinkUnavailable(string service) =>
        new(
            ErrorType.Unavailable,
            "SERVICE_LINK_UNAVAILABLE",
            $"The {service} service cannot be reached yet; try again later."
        );

    public static AppException SelfReview() =>
        new(ErrorType.RuleViolation, "CASE_SELF_REVIEW", "You cannot book your own service.");

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

    public static AppException AttachmentRequired() =>
        new(ErrorType.Validation, "ATTACHMENT_REQUIRED", "Choose a file to upload.");

    public static AppException AttachmentTooLarge(int maxBytes) =>
        new(
            ErrorType.Validation,
            "ATTACHMENT_TOO_LARGE",
            $"A file may be at most {maxBytes / 1024 / 1024} MB."
        );

    public static AppException AttachmentTypeInvalid() =>
        new(
            ErrorType.Validation,
            "ATTACHMENT_TYPE_INVALID",
            "Upload a PDF, JPEG, PNG, WebP or Word (.docx) file."
        );

    public static AppException AttachmentsClosed(string status) =>
        new(
            ErrorType.Conflict,
            "ATTACHMENTS_CLOSED",
            $"Files cannot be added while the case is {status}."
        );

    public static AppException AttachmentLimit(int max) =>
        new(ErrorType.Conflict, "ATTACHMENT_LIMIT", $"A case holds at most {max} files.");

    public static AppException AttachmentNotFound() =>
        new(ErrorType.NotFound, "ATTACHMENT_NOT_FOUND", "File not found.");

    public static AppException RatingClosed(string status) =>
        new(
            ErrorType.Conflict,
            "RATING_CLOSED",
            $"A case can be rated only once it is over; it is {status}."
        );

    public static AppException RatingExists() =>
        new(ErrorType.Conflict, "RATING_EXISTS", "This case was already rated.");

    public static AppException RatingInvalid(int max) =>
        new(ErrorType.Validation, "RATING_INVALID", $"The rating must be from 1 to {max} stars.");
}
