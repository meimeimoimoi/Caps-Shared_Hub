using Caps.Contracts;
using Caps.Expert.Infrastructure.Persistence;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>
/// Keeps the expert profile's copy of the account status in sync with auth, so the Marketplace only lists
/// ACTIVE accounts (BR-M01). Accounts without an expert profile are ignored.
/// </summary>
public sealed class AccountStatusChangedConsumer(ExpertDbContext db)
    : IConsumer<AccountStatusChangedEvent>
{
    public async Task Consume(ConsumeContext<AccountStatusChangedEvent> context)
    {
        var m = context.Message;
        var profile = await db.ExpertProfiles.SingleOrDefaultAsync(
            x => x.UserId == m.UserId,
            context.CancellationToken
        );
        if (profile == null)
            return;
        profile.RecordAccountStatus(m.Status);
        await db.SaveChangesAsync(context.CancellationToken);
    }
}
