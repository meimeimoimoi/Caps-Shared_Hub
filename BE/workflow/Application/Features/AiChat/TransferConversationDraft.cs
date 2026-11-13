using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;
public class TransferConversationDraft
{
    public sealed record TransferConversationDraftCommand(
        Guid ConversationId,
        Guid UserId,
        Guid? MessageId
        );
    public sealed class TranferConversationDraftHandler(
        IConversationRepository conversationRepository,
        IChatMessageRepository chatMessageRepository
        ) : ICommandHandler<TransferConversationDraftCommand, TransferDraftResponseDto>
    {
        public async Task<TransferDraftResponseDto> HandleAsync(TransferConversationDraftCommand command, CancellationToken ct)
        {
            var conversation = await conversationRepository.GetByIdAsync(command.ConversationId, ct);
            if(conversation is null)
            {
                throw WorkflowErrors.Conversation_NotFound(command.ConversationId);
            }

            if(conversation.UserId != command.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            ChatMessage? aiMessage;
            if (command.MessageId.HasValue)
            {
                aiMessage = await chatMessageRepository.GetByIdAsync(command.MessageId.Value, ct);
                if(aiMessage is null || aiMessage.ConversationId != conversation.Id){
                    throw WorkflowErrors.Messasge_NotFound(command.MessageId.Value);
                }
            }
            else
            {
                aiMessage = await chatMessageRepository.GetLatestAnsweredMessageAsync(conversation.Id, ct);
                if(aiMessage is null)
                {
                    throw WorkflowErrors.NoAnswerableMessageForDraftTransfer();
                }
            }

            List<CitationDto> citations = [];
            if (!string.IsNullOrWhiteSpace(aiMessage.Citations))
            {
                citations = JsonSerializer.Deserialize<List<CitationDto>>(aiMessage.Citations) ?? [];
            }

            var initialFormPayload = new
            {
                source = "CHAT_ASSISTED",
                conversation_id = conversation.Id,
                source_message_id = aiMessage.Id,
                ai_legal_analysis = aiMessage.Content,
                suggested_period_start = aiMessage.PeriodStart,
                suggested_period_end = aiMessage.PeriodEnd,
                extracted_citations = citations.Select(c => new
                {
                    c.DocNumber,
                    c.DocTitle,
                    c.Article,
                    c.Clause,
                    c.Point,
                }),
                extracted_facts = new
                {
                    topic = conversation.Title,
                    summary = aiMessage.Content.Length > 200 ? aiMessage.Content[..200] + "..." : aiMessage.Content
                }
            };

            var initialDataJson = JsonSerializer.Serialize(initialFormPayload);

            return new TransferDraftResponseDto(
                conversation.Id,
                aiMessage.Id,
                conversation.Title,
                aiMessage.PeriodStart,
                aiMessage.PeriodEnd,
                citations,
                initialDataJson
                );
        }
    }
}
