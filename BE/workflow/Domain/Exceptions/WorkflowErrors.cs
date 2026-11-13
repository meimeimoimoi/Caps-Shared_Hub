using Caps.Common.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Domain.Exceptions;
public class WorkflowErrors
{
    // conversation
    public static AppException Conversation_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_CONVERSATION_NOT_FOUND", $"Conversation with Id '{id}' was not found.");

    public static AppException Conversation_AccessDenied() =>
        new(ErrorType.Forbidden, "WORKFLOW_CONVERSATION_ACCESS_DENIED", $"Access denied to conversation");

    public static AppException Messasge_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_MESSAGE_NOT_FOUND", $"Message with Id '{id}' was not found.");

    public static AppException QuotaExhausted() =>
        new(ErrorType.Validation, "WORKFLOW_AI_QUOTA_EXHAUSTED", "Your AI query quota has been exhausted. Please recharge your quota or account credit.");

    public static AppException InvalidClarificationTarget() =>
        new(ErrorType.Validation, "WORKFLOW_INVALID_CLARIFICATION_TARGET", "Only AI messages with status 'NEED_CLARIFICATION' can be clarified.");

    public static AppException RagQueryFailed(string detail) =>
        new(ErrorType.RuleViolation, "WORKFLOW_RAG_SERVICE_ERROR", $"RAG query service returned an error: {detail}");

    public static AppException NoAnswerableMessageForDraftTransfer() =>
        new(ErrorType.Validation, "WORKFLOW_NO_ANSWERABLE_MESSAGE_FOR_DRAFT", "No answered AI message is available in this conversation to transfer into a draft.");

    // document & draft
    public static AppException Document_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_DOCUMENT_NOT_FOUND", $"Document with Id '{id}' was not found.");

    public static AppException Document_AccessDenied() =>
        new(ErrorType.Forbidden, "WORKFLOW_DOCUMENT_ACCESS_DENIED", "You do not have permission to access or modify this document.");

    public static AppException Document_InvalidPeriod() =>
        new(ErrorType.Validation, "WORKFLOW_DOCUMENT_INVALID_PERIOD", "Document period end date must be greater than or equal to period start date.");

    public static AppException Snapshot_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_SNAPSHOT_NOT_FOUND", $"Input snapshot with Id '{id}' was not found for this document.");

    public static AppException Snapshot_Required() =>
        new(ErrorType.Validation, "WORKFLOW_SNAPSHOT_REQUIRED", "No snapshot found. Please create an input snapshot before generating an AI draft.");

    public static AppException DocumentVersion_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_DOCUMENT_VERSION_NOT_FOUND", $"Document version with Id '{id}' was not found.");

    public static AppException OllamaGenerationFailed(string reason) =>
        new(ErrorType.RuleViolation, "WORKFLOW_OLLAMA_GENERATION_FAILED", $"Local AI drafting failed: {reason}");
}
