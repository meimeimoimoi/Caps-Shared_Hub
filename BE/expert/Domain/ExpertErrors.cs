using Caps.Common.Domain;

namespace Caps.Expert.Domain;

/// <summary>Business error codes of the expert service; the FE relies on these codes.</summary>
public static class ExpertErrors
{
    public static AppException ApplicationNotFound() =>
        new(ErrorType.NotFound, "APPLICATION_NOT_FOUND", "Expert application not found.");

    public static AppException ApplicationLocked(string status) =>
        new(
            ErrorType.Conflict,
            "APPLICATION_LOCKED",
            $"Application cannot be changed while {status}."
        );

    public static AppException ReapplyTooEarly(DateTimeOffset allowedFrom) =>
        new(
            ErrorType.Conflict,
            "REAPPLY_TOO_EARLY",
            $"A new application is allowed from {allowedFrom:O}."
        );

    public static AppException InvalidField(string field) =>
        new(ErrorType.Validation, "INVALID_FIELD", $"Unknown expertise field: {field}.");

    public static AppException InvalidBirthDate() =>
        new(ErrorType.Validation, "INVALID_BIRTH_DATE", "Birth date is invalid.");

    public static AppException InvalidEvidenceCode() =>
        new(ErrorType.Validation, "INVALID_EVIDENCE_CODE", "Unknown evidence category.");

    public static AppException SupplementNotRequested() =>
        new(
            ErrorType.Validation,
            "SUPPLEMENT_NOT_REQUESTED",
            "Supplementary files are only accepted when more information is requested."
        );

    public static AppException EvidenceRequired() =>
        new(ErrorType.Validation, "EVIDENCE_REQUIRED", "File is required.");

    public static AppException EvidenceTooLarge() =>
        new(ErrorType.Validation, "EVIDENCE_TOO_LARGE", "File must be 10 MB or smaller.");

    public static AppException EvidenceInvalidType() =>
        new(
            ErrorType.Validation,
            "EVIDENCE_INVALID_TYPE",
            "Only PDF, PNG or JPG files are allowed."
        );

    public static AppException EvidenceLimit(int max) =>
        new(ErrorType.Conflict, "EVIDENCE_LIMIT", $"An application can hold at most {max} files.");

    public static AppException EvidenceLimitUnverified(int max) =>
        new(
            ErrorType.Forbidden,
            "EVIDENCE_LIMIT_UNVERIFIED",
            $"Verify your email address to upload more than {max} files."
        );

    public static AppException EvidenceNotFound() =>
        new(ErrorType.NotFound, "EVIDENCE_NOT_FOUND", "File not found.");

    public static AppException EvidenceLocked() =>
        new(ErrorType.Conflict, "EVIDENCE_LOCKED", "Submitted files cannot be removed.");

    public static AppException EmailNotVerified() =>
        new(
            ErrorType.Forbidden,
            "EMAIL_NOT_VERIFIED",
            "Verify your email address before submitting."
        );

    public static AppException ApplicationIncomplete(IEnumerable<string> missing) =>
        new(
            ErrorType.Validation,
            "APPLICATION_INCOMPLETE",
            $"Missing required information: {string.Join(", ", missing)}."
        );

    public static AppException SupplementEmpty() =>
        new(
            ErrorType.Validation,
            "SUPPLEMENT_EMPTY",
            "Add an explanation or at least one new file."
        );

    public static AppException ExpertNotFound() =>
        new(ErrorType.NotFound, "EXPERT_NOT_FOUND", "Expert not found or not available.");

    public static AppException NotApprovedForService() =>
        new(
            ErrorType.Forbidden,
            "NOT_APPROVED_FOR_SERVICE",
            "Only approved experts can take cases."
        );

    public static AppException CapacityInvalid(int max) =>
        new(ErrorType.Validation, "CAPACITY_INVALID", $"Capacity must be between 1 and {max}.");

    public static AppException NotReadyToAccept() =>
        new(
            ErrorType.RuleViolation,
            "NOT_READY_TO_ACCEPT",
            "Set at least one service price before taking cases."
        );

    public static AppException TurnaroundInvalid(int max) =>
        new(
            ErrorType.Validation,
            "TURNAROUND_INVALID",
            $"Turnaround must be between 1 and {max} hours."
        );

    public static AppException ServiceTypeInvalid() =>
        new(
            ErrorType.Validation,
            "SERVICE_TYPE_INVALID",
            "Service code must be lowercase letter, digits and dashes (e.g. cit-review), at most 50 characters."
        );

    public static AppException ServiceTypeUnknown() =>
        new(
            ErrorType.NotFound,
            "SERVICE_TYPE_UNKNOWN",
            "This service is not open for pricing yet."
        );

    public static AppException PlatformFeeInvalid(int max) =>
        new(
            ErrorType.Validation,
            "PLATFORM_FEE_INVALID",
            $"Platform fee must be between 0 and {max} percent."
        );

    public static AppException FeeInvalid(long min, long max, long step) =>
        new(
            ErrorType.Validation,
            "FEE_INVALID",
            $"Fee must be between {min} and {max} VND, in steps of {step}."
        );

    public static AppException OfferingConflict() =>
        new(
            ErrorType.Conflict,
            "OFFERING_CONFLICT",
            "This service was changed at the same time. Reload and try again."
        );
}
