using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.BankAccounts;

/// <summary>Soft-deletes one of the signed-in user's bank accounts.</summary>
public sealed record RemoveBankAccountCommand(Guid UserId, Guid AccountId);

/// <summary>Removing the default hands the default to the newest remaining account.</summary>
public sealed class RemoveBankAccountHandler(
    IBankAccountRepository accounts,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RemoveBankAccountCommand, BankAccountResponse[]>
{
    public async Task<BankAccountResponse[]> HandleAsync(
        RemoveBankAccountCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await userLock.AcquireAsync(command.UserId, ct);
        var linked = await accounts.ListForUpdateAsync(command.UserId, ct);
        // Another user's account answers like a missing one
        var account =
            linked.FirstOrDefault(x => x.Id == command.AccountId)
            ?? throw BillingErrors.BankAccountNotFound();

        var wasDefault = account.IsDefault;
        account.Delete(now);
        await unitOfWork.SaveChangesAsync(ct);
        if (wasDefault)
        {
            var next = linked
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefault();
            next?.MakeDefault(now);
            await unitOfWork.SaveChangesAsync(ct);
        }
        await tx.CommitAsync(ct);
        return BankAccountResponse.ListOf(linked);
    }
}
