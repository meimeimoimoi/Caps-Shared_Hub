using System.Text.Json;
using Caps.Contracts;
using Caps.Expert.Infrastructure.Persistence;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>Background worker that moves outbox messages to RabbitMQ.</summary>
public sealed class ExpertNotificationPublisher(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<ExpertNotificationPublisher> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ExpertDbContext>();
                var bus = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
                await using var tx = await db.Database.BeginTransactionAsync(stoppingToken);
                // Several instances may run: each row is taken by one of them only
                var entries = await db
                    .NotificationOutbox.FromSqlRaw(
                        "SELECT * FROM expert.notification_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED"
                    )
                    .ToListAsync(stoppingToken);
                foreach (var row in entries)
                {
                    if (row.MessageType == nameof(ExpertEligibilityDecidedEvent))
                    {
                        var message = JsonSerializer.Deserialize<ExpertEligibilityDecidedEvent>(
                            row.Payload
                        )!;
                        await bus.Publish(message, ctx => ctx.MessageId = row.Id, stoppingToken);
                    }
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
                // Payloads hold an email address and are never logged
                logger.LogWarning(e, "Expert notification outbox unavailable; retrying.");
            }
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
