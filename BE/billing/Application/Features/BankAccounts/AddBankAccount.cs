using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.BankAccounts;

/// <summary>Links a bank account; <paramref name="MakeDefault"/> moves the default to it.</summary>
public sealed record AddBankAccountCommand(
    Guid UserId,
    string? BankBin,
    string? BankName,
    string? AccountNumber,
    string? AccountHolderName,
    bool MakeDefault
);

/// <summary>
/// The first account always becomes the default. The per-user lock plus partial unique indexes keep
/// exactly one default and no duplicate numbers, even under concurrent requests.
/// </summary>
public sealed class AddBankAccountHandler(
    IBankAccountRepository accounts,
    IAccountNumberProtector protector,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddBankAccountCommand, BankAccountResponse[]>
{
    public async Task<BankAccountResponse[]> HandleAsync(
        AddBankAccountCommand command,
        CancellationToken ct
    )
    {
        var details = BankAccountRules.Details(
            command.BankBin,
            command.BankName,
            command.AccountHolderName
        );
        var number = protector.Protect(
            BankAccountRules.NormalizeAccountNumber(command.AccountNumber)
        );
        var now = clock.GetUtcNow();

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await userLock.AcquireAsync(command.UserId, ct);
        var linked = await accounts.ListForUpdateAsync(command.UserId, ct);
        if (linked.Any(x => x.AccountNumberHash == number.Hash))
            throw BillingErrors.BankAccountDuplicate();
        if (linked.Count >= BankAccountRules.MaxAccounts)
            throw BillingErrors.BankAccountLimit(BankAccountRules.MaxAccounts);

        var current = linked.FirstOrDefault(x => x.IsDefault);
        var isDefault = command.MakeDefault || current == null;
        if (isDefault && current != null)
        {
            // Saved first so the single-default index never sees two defaults at once
            current.ClearDefault(now);
            await unitOfWork.SaveChangesAsync(ct);
        }
        var account = BankAccount.Register(command.UserId, details, number, isDefault, now);
        accounts.Add(account);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Only reachable if the lock was bypassed; the indexes are the last line of defence
            throw BillingErrors.BankAccountDuplicate();
        }
        await tx.CommitAsync(ct);
        return BankAccountResponse.ListOf([.. linked, account]);
    }
}
