using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.BankAccounts;

/// <summary>Lists the signed-in user's linked bank accounts.</summary>
public sealed record ListBankAccountsQuery(Guid UserId);

/// <summary>Default account first, then newest; deleted accounts are left out.</summary>
public sealed class ListBankAccountsHandler(IBankAccountRepository accounts)
    : IQueryHandler<ListBankAccountsQuery, BankAccountResponse[]>
{
    public async Task<BankAccountResponse[]> HandleAsync(
        ListBankAccountsQuery query,
        CancellationToken ct
    )
    {
        var list = await accounts.ListAsync(query.UserId, ct);
        return BankAccountResponse.ListOf(list);
    }
}
