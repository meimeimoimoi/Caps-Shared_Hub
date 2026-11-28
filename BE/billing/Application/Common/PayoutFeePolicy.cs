namespace Caps.Billing.Application.Common;

/// <summary>
/// What one PayOS transfer costs the platform, from Billing:PayoutFeePerTransfer (the PayOS contract); the
/// platform bears it, the expert receives the full amount (advisor 2026-11-28).
/// </summary>
public sealed record PayoutFeePolicy(long PerTransfer);
