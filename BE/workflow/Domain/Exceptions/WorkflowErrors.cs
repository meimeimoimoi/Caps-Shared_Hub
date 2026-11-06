using Caps.Common.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Domain.Exceptions;
public class WorkflowErrors
{
    public static AppException Conversation_NotFound(Guid id) =>
        new(ErrorType.NotFound, "WORKFLOW_CONVERSATION_NOT_FOUND", $"Conversation with Id '{id}' was not found.");

    public static AppException Conversation_AccessDenied(Guid id) =>
        new(ErrorType.Forbidden, "WORKFLOW_CONVERSATION_ACCESS_DENIED", $"Access denied to conversation with Id '{id}'.");

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
}
