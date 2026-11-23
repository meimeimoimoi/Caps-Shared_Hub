using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Wallet;

/// <summary>Reads the signed-in user's credit wallet.</summary>
public sealed record GetMyWalletQuery(Guid UserId);

/// <summary>Returns an empty wallet when the user has never topped up; reading never creates one.</summary>
public sealed class GetMyWalletHandler(ICreditWalletRepository wallets)
    : IQueryHandler<GetMyWalletQuery, WalletResponse>
{
    public async Task<WalletResponse> HandleAsync(GetMyWalletQuery query, CancellationToken ct)
    {
        var wallet = await wallets.FindAsync(query.UserId, ct);
        if (wallet == null)
            return new WalletResponse(0, 0, null);
        return new WalletResponse(wallet.Balance, wallet.Held, wallet.UpdatedAt);
    }
}
