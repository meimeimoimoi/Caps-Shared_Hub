using System.Text.Json;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Contracts;
using MassTransit;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Auth.Infrastructure.Email;

public sealed class AuthEmailPublisher(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<AuthEmailPublisher> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                var protector = scope
                    .ServiceProvider.GetRequiredService<IDataProtectionProvider>()
                    .CreateProtector(AuthEmailOutboxWriter.ProtectorPurpose);
                var bus = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
                await using var tx = await db.Database.BeginTransactionAsync(ct);
                var entries = await db
                    .EmailOutbox.FromSqlRaw(
                        "SELECT * FROM identity.auth_email_outbox WHERE \"SentAt\" IS NULL ORDER BY \"CreatedAt\" LIMIT 20 FOR UPDATE SKIP LOCKED"
                    )
                    .ToListAsync(ct);
                foreach (var row in entries)
                {
                    var message = JsonSerializer.Deserialize<AuthEmailRequestedEvent>(
                        protector.Unprotect(row.ProtectedPayload)
                    )!;
                    var now = clock.GetUtcNow();
                    if (message.ExpiresAt > now)
                        await bus.Publish(message, ctx => ctx.MessageId = message.Id, ct);
                    row.SentAt = now;
                    row.ProtectedPayload = "";
                }
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception e)
            {
                // The exception says why (database, broker, key ring); payloads are never logged
                logger.LogWarning(e, "Auth email outbox unavailable; retrying.");
            }
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
