using Caps.Billing.Application.Features.Payouts;
using Caps.Common.Application;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Billing.Infrastructure.Jobs;

/// <summary>Sends the payout reminders once a day, on the first check after 08:00 Vietnam time.</summary>
public sealed class PayoutReminderJob(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<PayoutReminderJob> logger
) : BackgroundService
{
    private const int SendHour = 8;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // ponytail: the sent day lives in memory, so a restart after 08:00 sends that day's reminders again
        DateOnly? sentOn = null;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10), clock);
        do
        {
            var local = clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7));
            var today = DateOnly.FromDateTime(local.DateTime);
            if (local.Hour < SendHour || sentOn == today)
            {
                continue;
            }
            try
            {
                using var scope = scopes.CreateScope();
                var handler = scope.ServiceProvider.GetRequiredService<
                    ICommandHandler<SendPayoutRemindersCommand>
                >();
                await handler.HandleAsync(new(), stoppingToken);
                sentOn = today;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogWarning(e, "Payout reminders failed; retrying at the next check.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
