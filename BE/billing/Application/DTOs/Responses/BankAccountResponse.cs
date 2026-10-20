using Caps.Billing.Domain;

namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>A linked bank account; only the last 4 digits of the number ever leave the service.</summary>
public sealed record BankAccountResponse(
    string Id,
    string BankBin,
    string BankName,
    string AccountLast4,
    string AccountHolderName,
    bool IsDefault,
    string Status,
    DateTimeOffset CreatedAt
)
{
    public static BankAccountResponse From(BankAccount x) =>
        new(
            x.Id.ToString(),
            x.BankBin,
            x.BankName,
            x.AccountLast4,
            x.AccountHolderName,
            x.IsDefault,
            x.Status,
            x.CreatedAt
        );

    /// <summary>Linked accounts, default first then newest; deleted ones are left out.</summary>
    public static BankAccountResponse[] ListOf(IEnumerable<BankAccount> accounts) =>
        accounts
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.CreatedAt)
            .Select(From)
            .ToArray();
}
