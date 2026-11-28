using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.BankAccounts;

/// <summary>Staff verify an UNVERIFIED bank account or reject it with a reason.</summary>
public sealed record ReviewBankAccountCommand(
    Guid AccountId,
    Guid StaffId,
    bool Verified,
    string? Reason
);

/// <summary>
/// A one-time decision: only VERIFIED accounts receive payouts, and a REJECTED account stays rejected (the
/// expert links another one). Takes the owner's user lock like every bank account change.
/// </summary>
public sealed class ReviewBankAccountHandler(
    IBankAccountRepository accounts,
    IAccountNumberProtector protector,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ReviewBankAccountCommand, ReviewBankAccountResponse>
{
    public async Task<ReviewBankAccountResponse> HandleAsync(
        ReviewBankAccountCommand command,
        CancellationToken ct
    )
    {
        var owner =
            (await accounts.FindAsync(command.AccountId, ct))?.UserId
            ?? throw BillingErrors.BankAccountNotFound();

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await userLock.AcquireAsync(owner, ct);
        // Read again under the lock: the expert may have removed it meanwhile
        var account =
            (await accounts.ListForUpdateAsync(owner, ct)).FirstOrDefault(x =>
                x.Id == command.AccountId
            ) ?? throw BillingErrors.BankAccountNotFound();
        var now = clock.GetUtcNow();
        if (command.Verified)
            account.Verify(command.StaffId, now);
        else
            account.Reject(command.StaffId, command.Reason, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewBankAccountResponse.From(account, protector.Reveal(account.AccountNumberEnc));
    }
}
