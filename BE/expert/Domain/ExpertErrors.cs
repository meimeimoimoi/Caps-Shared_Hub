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

    public static AppException InvalidPaging(int maxPageSize) =>
        new(
            ErrorType.Validation,
            "INVALID_PAGING",
            $"page must be at least 1 and pageSize between 1 and {maxPageSize}."
        );

    public static AppException InvalidField(string field) =>
        new(ErrorType.Validation, "INVALID_FIELD", $"Unknown expertise field: {field}.");

    public static AppException InvalidBirthDate() =>
        new(ErrorType.Validation, "INVALID_BIRTH_DATE", "Birth date is invalid.");

    public static AppException DeclarationRequired(string code) =>
        new(
            ErrorType.Validation,
            "DECLARATION_REQUIRED",
            $"Agree to the {code} statement before submitting."
        );

    public static AppException ContactRequired(string field) =>
        new(ErrorType.Validation, "CONTACT_REQUIRED", $"{field} is required.");

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

    public static AppException EvidenceInvalidUrl() =>
        new(
            ErrorType.Validation,
            "EVIDENCE_INVALID_URL",
            "Enter a public HTTP or HTTPS URL without credentials (at most 2048 characters)."
        );

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

    public static AppException EvidenceNotFound() =>
        new(ErrorType.NotFound, "EVIDENCE_NOT_FOUND", "File not found.");

    public static AppException EvidenceDuplicate() =>
        new(ErrorType.Conflict, "EVIDENCE_DUPLICATE", "This CV has already been uploaded.");

    public static AppException EvidenceLocked() =>
        new(ErrorType.Conflict, "EVIDENCE_LOCKED", "Submitted files cannot be removed.");

    public static AppException EmailNotVerified() =>
        new(
            ErrorType.Forbidden,
            "EMAIL_NOT_VERIFIED",
            "Verify your email address before changing your expert application."
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
            $"Result of {code} must be PASS, FAIL or NEED_MORE_INFORMATION (NOT_APPLICABLE only where the policy allows it)."
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
            ErrorType.Forbidden,
            "PRICING_NOT_ALLOWED",
            $"Only experts approved for this service can price it; the service is {qualificationStatus}."
        );

    public static AppException PlatformFeeInvalid(int max) =>
        new(
            ErrorType.Validation,
            "PLATFORM_FEE_INVALID",
            $"Platform fee must be between 0 and {max} percent."
        );

    public static AppException LateRuleInvalid(int maxHours) =>
        new(
            ErrorType.Validation,
            "LATE_RULE_INVALID",
            $"Late hours must be 0 to {maxHours} with the cancel hours not below the penalty hours, and the penalty plus the platform fee at most 100 percent."
        );

    public static AppException PlatformFeeNotSet() =>
        new(
            ErrorType.RuleViolation,
            "PLATFORM_FEE_NOT_SET",
            "The platform fee of this service is not set yet, so it cannot be priced."
        );

    public static AppException FeeInvalid(long min, long max, long step) =>
        new(
            ErrorType.Validation,
            "FEE_INVALID",
            $"Fee must be between {min} and {max} VND, in steps of {step}."
        );

    public static AppException TurnaroundInvalid(int minDays, int maxDays) =>
        new(
            ErrorType.Validation,
            "TURNAROUND_INVALID",
            $"Turnaround must be whole days between {minDays} and {maxDays}."
        );

    public static AppException PlatformFeeTooSoon(int noticeDays, DateOnly earliest) =>
        new(
            ErrorType.Validation,
            "PLATFORM_FEE_TOO_SOON",
            $"A platform fee change must be announced {noticeDays} days ahead; it can take effect on {earliest:yyyy-MM-dd} at the earliest."
        );

    public static AppException PlatformFeeNotPending() =>
        new(
            ErrorType.Conflict,
            "PLATFORM_FEE_NOT_PENDING",
            "There is no pending platform fee change to cancel. Reload and try again."
        );

    public static AppException OfferingConflict() =>
        new(
            ErrorType.Conflict,
            "OFFERING_CONFLICT",
            "This service was changed at the same time. Reload and try again."
        );

    public static AppException CapacityInvalid(int max) =>
        new(ErrorType.Validation, "CAPACITY_INVALID", $"Capacity must be between 1 and {max}.");

    public static AppException ExpertNotFound() =>
        new(ErrorType.NotFound, "EXPERT_NOT_FOUND", "Expert not found.");

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

    public static AppException MaterialChangeRequired(IEnumerable<string> criteria) =>
        new(
            ErrorType.Conflict,
            "MATERIAL_CHANGE_REQUIRED",
            $"Update your information or add new evidence for: {string.Join(", ", criteria)}."
        );

    public static AppException UnknownPolicySetting(string key) =>
        new(ErrorType.Validation, "UNKNOWN_POLICY_SETTING", $"Unknown policy setting: {key}.");

    public static AppException PolicySettingOutOfRange(string key, int min, int max) =>
        new(
            ErrorType.Validation,
            "POLICY_SETTING_OUT_OF_RANGE",
            $"{key} must be a whole number between {min} and {max}."
        );

    public static AppException PolicyReasonRequired() =>
        new(ErrorType.Validation, "POLICY_REASON_REQUIRED", "Give the reason for the change.");

    public static AppException PolicyReasonTooLong(int max) =>
        new(
            ErrorType.Validation,
            "POLICY_REASON_TOO_LONG",
            $"The reason can be at most {max} characters."
        );

    public static AppException PolicyExpectedValueRequired(string key) =>
        new(
            ErrorType.Validation,
            "POLICY_EXPECTED_VALUE_REQUIRED",
            $"Send the value of {key} you are changing from."
        );

    /// <summary>Someone else changed the value since it was read; nothing was saved.</summary>
    public static AppException PolicyRangeInverted(string minKey, string maxKey) =>
        new(
            ErrorType.Validation,
            "POLICY_RANGE_INVERTED",
            $"{minKey} may not be greater than {maxKey}."
        );

    public static AppException PolicyChanged(string key) =>
        new(
            ErrorType.Conflict,
            "POLICY_CHANGED",
            $"{key} was changed by someone else. Reload and try again."
        );

    /// <summary>Another reviewer holds the review; the caller reloads it to see who.</summary>
    public static AppException ReviewClaimed() =>
        new(
            ErrorType.Conflict,
            "REVIEW_CLAIMED",
            "Another reviewer is already working on this review."
        );

    /// <summary>The review returned to the queue or belongs to another reviewer; nothing was saved.</summary>
    public static AppException ReviewNotClaimed() =>
        new(
            ErrorType.Conflict,
            "REVIEW_NOT_CLAIMED",
            "Claim this review before deciding it; it is not yours or your claim has expired."
        );

    public static AppException ClaimReassignReasonRequired() =>
        new(
            ErrorType.Validation,
            "CLAIM_REASSIGN_REASON_REQUIRED",
            "Give the reason for handing the review to another reviewer."
        );

    public static AppException ClaimReassignReasonTooLong(int max) =>
        new(
            ErrorType.Validation,
            "CLAIM_REASSIGN_REASON_TOO_LONG",
            $"The reason can be at most {max} characters."
        );

    public static AppException InformationRequestLimit(int max) =>
        new(
            ErrorType.Conflict,
            "INFORMATION_REQUEST_LIMIT",
            $"More information has already been requested {max} times; decide with the evidence at hand."
        );

    public static AppException EvidenceCompetencyRequired() =>
        new(
            ErrorType.Validation,
            "EVIDENCE_COMPETENCY_REQUIRED",
            "Tie the file to at least one competency."
        );

    public static AppException InvalidCompetencyCode() =>
        new(ErrorType.Validation, "INVALID_COMPETENCY_CODE", "Unknown competency.");

    public static AppException CompetencyDescriptionTooLong(int max) =>
        new(
            ErrorType.Validation,
            "COMPETENCY_DESCRIPTION_TOO_LONG",
            $"The description can be at most {max} characters."
        );

    public static AppException CompetencyEvidenceMissing() =>
        new(
            ErrorType.Validation,
            "COMPETENCY_EVIDENCE_MISSING",
            "Add at least one file or link tied to a competency before submitting."
        );

    /// <summary>E7: each competency that failed needs a new file tied to it.</summary>
    public static AppException CompetencyNewEvidenceRequired(IEnumerable<string> competencies) =>
        new(
            ErrorType.Validation,
            "COMPETENCY_NEW_EVIDENCE_REQUIRED",
            $"Add new evidence for: {string.Join(", ", competencies)}."
        );

    public static AppException ReviewerNotFound() =>
        new(
            ErrorType.NotFound,
            "REVIEWER_NOT_FOUND",
            "Reviewer not found; they must open the review queue at least once."
        );
}
