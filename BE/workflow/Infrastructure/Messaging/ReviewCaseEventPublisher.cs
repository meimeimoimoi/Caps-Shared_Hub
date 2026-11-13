using System.Text.Json;
using Caps.Contracts;
using Caps.Workflow.Infrastructure.Persistence;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>Background worker that moves committed outbox events to RabbitMQ every few seconds.</summary>
public sealed class ReviewCaseEventPublisher(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<ReviewCaseEventPublisher> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
                var bus = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
                await using var tx = await db.Database.BeginTransactionAsync(stoppingToken);
                // Several instances may run; each row is taken by one of them only
                var entries = await db
                    .EventOutbox.FromSqlRaw(
                        "SELECT * FROM review.event_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED"
                    )
                    .ToListAsync(stoppingToken);
                foreach (var row in entries)
                {
                    var type = typeof(ReviewCaseRequestedEvent).Assembly.GetType(row.MessageType)!;
                    var message = JsonSerializer.Deserialize(row.Payload, type)!;
                    await bus.Publish(message, type, stoppingToken);
                    row.SentAt = clock.GetUtcNow();
                    row.Payload = "";
                }
                await db.SaveChangesAsync(stoppingToken);
                await tx.CommitAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception e)
            {
                // Payload may hold the client's email and is never logged
                logger.LogError(e, "Review case event outbox unavailable; retrying.");
            }
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
