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

    public static AppException AlreadyEligible() =>
        new(
            ErrorType.Conflict,
            "ALREADY_ELIGIBLE",
            "Eligibility has already been confirmed; no new application is needed."
        );

    public static AppException ApplicationNotInReview(string status) =>
        new(
            ErrorType.Conflict,
            "APPLICATION_NOT_IN_REVIEW",
            $"Only submitted applications can be decided; this one is {status}."
        );

    public static AppException SelfReviewNotAllowed() =>
        new(
            ErrorType.Forbidden,
            "SELF_REVIEW_NOT_ALLOWED",
            "Reviewers cannot decide their own application."
        );

    public static AppException InvalidEligibilityCriteria() =>
        new(
            ErrorType.Validation,
            "INVALID_ELIGIBILITY_CRITERIA",
            "Give exactly one result for each of EV-01 to EV-06."
        );

    public static AppException InvalidEligibilityResult(string code) =>
        new(
            ErrorType.Validation,
            "INVALID_ELIGIBILITY_RESULT",
            $"Result of {code} must be PASS, FAIL or NEED_MORE_INFORMATION."
        );

    public static AppException EligibilityNoteRequired(string code) =>
        new(
            ErrorType.Validation,
            "ELIGIBILITY_NOTE_REQUIRED",
            $"Explain the result of {code}: what is missing or why it is not met."
        );

    public static AppException ExperienceBelowMinimum(int minYears) =>
        new(
            ErrorType.Validation,
            "EXPERIENCE_BELOW_MINIMUM",
            $"EV-06 cannot pass: the declared experience is below {minYears} years."
        );

    public static AppException ServiceNotFound() =>
        new(ErrorType.NotFound, "SERVICE_NOT_FOUND", "Service not found or not offered.");

    public static AppException EligibilityRequired() =>
        new(
            ErrorType.Conflict,
            "ELIGIBILITY_REQUIRED",
            "Pass the eligibility review (Gate 1) before registering for a service."
        );

    public static AppException QualificationNotFound() =>
        new(ErrorType.NotFound, "QUALIFICATION_NOT_FOUND", "Service qualification not found.");

    public static AppException QualificationExists(string status) =>
        new(
            ErrorType.Conflict,
            "QUALIFICATION_EXISTS",
            $"This service already has a qualification that is {status}."
        );

    public static AppException QualificationLocked(string status) =>
        new(
            ErrorType.Conflict,
            "QUALIFICATION_LOCKED",
            $"Qualification cannot be changed while {status}."
        );

    public static AppException QualificationNotInReview(string status) =>
        new(
            ErrorType.Conflict,
            "QUALIFICATION_NOT_IN_REVIEW",
            $"Only qualifications in competency review can be decided; this one is {status}."
        );

    public static AppException QualificationNotPendingApproval(string status) =>
        new(
            ErrorType.Conflict,
            "QUALIFICATION_NOT_PENDING_APPROVAL",
            $"Only qualifications waiting for final approval can be decided; this one is {status}."
        );

    public static AppException FinalApproverIsReviewer() =>
        new(
            ErrorType.Forbidden,
            "FINAL_APPROVER_IS_REVIEWER",
            "The Gate 2 reviewer cannot also give the final approval."
        );

    public static AppException InvalidFinalApprovalDecision() =>
        new(
            ErrorType.Validation,
            "INVALID_FINAL_APPROVAL_DECISION",
            "Decision must be APPROVE or RETURN_FOR_REVIEW."
        );

    public static AppException FinalApprovalNoteRequired() =>
        new(
            ErrorType.Validation,
            "FINAL_APPROVAL_NOTE_REQUIRED",
            "Explain what must be reviewed again."
        );

    public static AppException ServiceNotApproved(string status) =>
        new(
            ErrorType.Conflict,
            "SERVICE_NOT_APPROVED",
            $"Only an approved service can be suspended; this one is {status}."
        );

    public static AppException ServiceNotSuspended(string status) =>
        new(
            ErrorType.Conflict,
            "SERVICE_NOT_SUSPENDED",
            $"Only a suspended service can be reinstated; this one is {status}."
        );

    public static AppException SuspensionNoteRequired() =>
        new(
            ErrorType.Validation,
            "SUSPENSION_NOTE_REQUIRED",
            "Give the reason for the suspension."
        );

    public static AppException InvalidServiceAccessAction() =>
        new(
            ErrorType.Validation,
            "INVALID_SERVICE_ACCESS_ACTION",
            "Action must be SUSPEND or REINSTATE."
        );

    public static AppException PricingNotAllowed(string qualificationStatus) =>
        new(
            ErrorType.Conflict,
            "PRICING_NOT_ALLOWED",
            $"Prices can only be set for an approved service; this one is {qualificationStatus}."
        );

    public static AppException PriceOutOfRange(long min, long max) =>
        new(
            ErrorType.Validation,
            "PRICE_OUT_OF_RANGE",
            $"Price must be between {min} and {max} VND."
        );

    public static AppException EffectiveDateInPast() =>
        new(
            ErrorType.Validation,
            "EFFECTIVE_DATE_IN_PAST",
            "The effective date cannot be in the past."
        );

    public static AppException PricingReasonRequired() =>
        new(
            ErrorType.Validation,
            "PRICING_REASON_REQUIRED",
            "Explain the price before submitting it."
        );

    public static AppException PricingReasonTooLong(int max) =>
        new(
            ErrorType.Validation,
            "PRICING_REASON_TOO_LONG",
            $"The reason can be at most {max} characters."
        );

    public static AppException PricingVersionLocked(string status) =>
        new(
            ErrorType.Conflict,
            "PRICING_VERSION_LOCKED",
            $"This price cannot be changed while {status}."
        );

    public static AppException PricingPendingApproval() =>
        new(
            ErrorType.Conflict,
            "PRICING_PENDING_APPROVAL",
            "A price change is waiting for approval; wait for the decision before changing it again."
        );

    public static AppException PricingRevisionConflict() =>
        new(
            ErrorType.Conflict,
            "PRICING_REVISION_CONFLICT",
            "The prices changed meanwhile; reload and try again."
        );

    public static AppException PricingVersionNotFound() =>
        new(ErrorType.NotFound, "PRICING_VERSION_NOT_FOUND", "Pricing version not found.");

    public static AppException PricingNotPending(string status) =>
        new(
            ErrorType.Conflict,
            "PRICING_NOT_PENDING",
            $"Only prices waiting for approval can be decided; this one is {status}."
        );

    public static AppException PricingNoteRequired() =>
        new(
            ErrorType.Validation,
            "PRICING_NOTE_REQUIRED",
            "Explain why the price is returned or rejected."
        );

    public static AppException InvalidPricingDecision() =>
        new(
            ErrorType.Validation,
            "INVALID_PRICING_DECISION",
            "Decision must be APPROVE, RETURN_FOR_REVISION or REJECT."
        );

    public static AppException NewEvidenceRequired() =>
        new(
            ErrorType.Validation,
            "NEW_EVIDENCE_REQUIRED",
            "Upload new or updated competency evidence before sending a re-registration for review."
        );

    public static AppException InvalidCompetencyCriteria() =>
        new(
            ErrorType.Validation,
            "INVALID_COMPETENCY_CRITERIA",
            "Give exactly one result for each of C1 to C5."
        );

    public static AppException InvalidCompetencyResult(string code) =>
        new(
            ErrorType.Validation,
            "INVALID_COMPETENCY_RESULT",
            $"Result of {code} must be PASS, FAIL or NEED_MORE_INFORMATION."
        );

    public static AppException CompetencyNoteRequired(string code) =>
        new(
            ErrorType.Validation,
            "COMPETENCY_NOTE_REQUIRED",
            $"Write the assessment note for {code}."
        );

    public static AppException CompetencyEvidenceRequired(string code) =>
        new(
            ErrorType.Validation,
            "COMPETENCY_EVIDENCE_REQUIRED",
            $"Cite at least one file supporting the result of {code}."
        );

    public static AppException CompetencyEvidenceUnknown(string code) =>
        new(
            ErrorType.Validation,
            "COMPETENCY_EVIDENCE_UNKNOWN",
            $"A file cited for {code} does not belong to this qualification."
        );
}
