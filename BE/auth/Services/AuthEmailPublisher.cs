using System.Text.Json;
using auth.Data;
using Caps.Common.Messaging;
using MassTransit;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
namespace auth.Services;
public sealed class AuthEmailPublisher(IServiceScopeFactory scopes, ILogger<AuthEmailPublisher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                var protector = scope.ServiceProvider.GetRequiredService<IDataProtectionProvider>().CreateProtector("AuthEmailOutbox.v1");
                var bus = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
                await using var tx = await db.Database.BeginTransactionAsync(ct);
                var entries = await db.EmailOutbox.FromSqlRaw("SELECT * FROM identity.auth_email_outbox WHERE \"SentAt\" IS NULL ORDER BY \"CreatedAt\" LIMIT 20 FOR UPDATE SKIP LOCKED").ToListAsync(ct);
                foreach (var row in entries)
                {
                    var message = JsonSerializer.Deserialize<AuthEmailRequestedEvent>(protector.Unprotect(row.ProtectedPayload))!;
                    if (message.ExpiresAt > DateTimeOffset.UtcNow) await bus.Publish(message, ctx => ctx.MessageId = message.Id, ct);
                    row.SentAt = DateTimeOffset.UtcNow; row.ProtectedPayload = "";
                }
                await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception) { logger.LogWarning("Auth email outbox unavailable; retrying. Payloads are not logged."); }
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
