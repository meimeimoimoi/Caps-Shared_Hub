using System.Text.Json;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Contracts;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Auth.Infrastructure.Messaging;

/// <summary>Background worker that moves account events from the outbox to RabbitMQ.</summary>
public sealed class AccountEventPublisher(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<AccountEventPublisher> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                var bus = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
                await using var tx = await db.Database.BeginTransactionAsync(stoppingToken);
                // Several instances may run: each row is taken by one of them only
                var entries = await db
                    .AccountEventOutbox.FromSqlRaw(
                        "SELECT * FROM identity.account_event_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED"
                    )
                    .ToListAsync(stoppingToken);
                foreach (var row in entries)
                {
                    var message = JsonSerializer.Deserialize<AccountStatusChangedEvent>(
                        row.Payload
                    )!;
                    await bus.Publish(message, ctx => ctx.MessageId = row.Id, stoppingToken);
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
                logger.LogWarning(e, "Account event outbox unavailable; retrying.");
            }
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
