using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Exceptions;

/// <summary>Domain error factories for the workflow service.</summary>
public static class WorkflowErrors
{
    // conversation
    public static AppException ConversationNotFound(Guid id) =>
        new(
            ErrorType.NotFound,
            "WORKFLOW_CONVERSATION_NOT_FOUND",
            $"Conversation with Id '{id}' was not found."
        );

    public static AppException ConversationAccessDenied() =>
        new(
            ErrorType.Forbidden,
            "WORKFLOW_CONVERSATION_ACCESS_DENIED",
            "Access denied to conversation"
        );

    public static AppException MessageNotFound(Guid id) =>
        new(
            ErrorType.NotFound,
            "WORKFLOW_MESSAGE_NOT_FOUND",
            $"Message with Id '{id}' was not found."
        );

    public static AppException QuotaExhausted() =>
        new(
            ErrorType.Validation,
            "WORKFLOW_AI_QUOTA_EXHAUSTED",
            "Your AI query quota has been exhausted. Please recharge your quota or account credit."
        );

    public static AppException InvalidClarificationTarget() =>
        new(
            ErrorType.Validation,
            "WORKFLOW_INVALID_CLARIFICATION_TARGET",
            "Only AI messages with status 'NEED_CLARIFICATION' can be clarified."
        );

    public static AppException RagQueryFailed() =>
        new(
            ErrorType.Unavailable,
            "WORKFLOW_RAG_SERVICE_UNAVAILABLE",
            "AI assistant is temporarily unavailable. Please try again later."
        );

    public static AppException NoAnswerableMessageForDraftTransfer() =>
        new(
            ErrorType.Validation,
            "WORKFLOW_NO_ANSWERABLE_MESSAGE_FOR_DRAFT",
            "No answered AI message is available in this conversation to transfer into a draft."
        );

    // document & draft
    public static AppException DocumentNotFound(Guid id) =>
        new(
            ErrorType.NotFound,
            "WORKFLOW_DOCUMENT_NOT_FOUND",
            $"Document with Id '{id}' was not found."
        );

    public static AppException DocumentAccessDenied() =>
        new(
            ErrorType.Forbidden,
            "WORKFLOW_DOCUMENT_ACCESS_DENIED",
            "You do not have permission to access or modify this document."
        );

    public static AppException DocumentInvalidPeriod() =>
        new(
            ErrorType.Validation,
            "WORKFLOW_DOCUMENT_INVALID_PERIOD",
            "Document period end date must be greater than or equal to period start date."
        );

    public static AppException SnapshotNotFound(Guid id) =>
        new(
            ErrorType.NotFound,
            "WORKFLOW_SNAPSHOT_NOT_FOUND",
            $"Input snapshot with Id '{id}' was not found for this document."
        );

    public static AppException SnapshotRequired() =>
        new(
            ErrorType.Validation,
            "WORKFLOW_SNAPSHOT_REQUIRED",
            "No snapshot found. Please create an input snapshot before generating an AI draft."
        );

    public static AppException DocumentVersionNotFound(Guid id) =>
        new(
            ErrorType.NotFound,
            "WORKFLOW_DOCUMENT_VERSION_NOT_FOUND",
            $"Document version with Id '{id}' was not found."
        );

    public static AppException DraftGenerationFailed() =>
        new(
            ErrorType.Unavailable,
            "WORKFLOW_DRAFT_GENERATION_UNAVAILABLE",
            "Draft generation is temporarily unavailable. Please try again later."
        );

    public static AppException DraftInProgress() =>
        new(
            ErrorType.Conflict,
            "WORKFLOW_DRAFT_IN_PROGRESS",
            "A draft is already being generated for this document. Please wait."
        );

    public static AppException DraftCooldownActive() =>
        new(
            ErrorType.RuleViolation,
            "WORKFLOW_DRAFT_COOLDOWN",
            "A draft was recently generated for this document. Please wait before generating another."
        );
}
