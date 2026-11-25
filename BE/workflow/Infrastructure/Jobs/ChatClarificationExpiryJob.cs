using Caps.Common.Application;
using Caps.Workflow.Application.Features.AiChat;
using Caps.Workflow.Domain.Workspace;
using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Jobs;

/// <summary>
/// Every minute, closes AI chat clarification prompts whose 24-hour response deadline passed,
/// each in its own scope so one failure (e.g. billing unavailable) does not starve the rest.
/// </summary>
public sealed class ChatClarificationExpiryJob(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<ChatClarificationExpiryJob> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1), clock);
        do
        {
            var tried = new List<Guid>();
            while (await FindOverdueAsync(tried, stoppingToken) is { Count: > 0 } batch)
            {
                foreach (var id in batch)
                {
                    await ExpireAsync(id, stoppingToken);
                    tried.Add(id);
                }
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    // Two instances may pick the same message: the handler locks the row, so the second finds it already resolved.
    private async Task<List<Guid>> FindOverdueAsync(List<Guid> tried, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
            var now = clock.GetUtcNow();
            return await db
                .Database.SqlQuery<Guid>(
                    $"""
                    SELECT m.id AS "Value" FROM workspace.chat_message m
                    WHERE m.sender = {ChatMessageSender.AI}
                      AND m.answer_status = {ChatMessageAnswerStatus.NeedClarification}
                      AND m.clarification_resolved_at IS NULL
                      AND m.clarification_deadline IS NOT NULL
                      AND m.clarification_deadline <= {now}
                      AND m.id <> ALL({tried.ToArray()})
                    ORDER BY m.clarification_deadline
                    LIMIT 100
                    """
                )
                .ToListAsync(ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(
                e,
                "Overdue AI chat clarifications could not be read; retrying next minute."
            );
            return [];
        }
    }

    private async Task ExpireAsync(Guid messageId, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<
                ICommandHandler<ExpireChatClarificationCommand>
            >();
            await handler.HandleAsync(new(messageId), ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(
                e,
                "AI chat clarification {MessageId} could not be expired; retrying next minute.",
                messageId
            );
        }
    }
}
