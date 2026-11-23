namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>The account's credit wallet: spendable balance and the amount held for work in progress.</summary>
/// <param name="UpdatedAt">Last change of the wallet; null when no wallet exists yet.</param>
public sealed record WalletResponse(long Balance, long Held, DateTimeOffset? UpdatedAt);
