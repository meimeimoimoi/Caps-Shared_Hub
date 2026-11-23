namespace Caps.Billing.Infrastructure.Payments;

/// <summary>
/// PayOS merchant channel ("PayOS" section). The three keys come from user-secrets or the environment, never from
/// appsettings; without them billing still starts and payments answer PAYMENT_UNAVAILABLE.
/// </summary>
public sealed class PayOsOptions
{
    public string ClientId { get; init; } = "";
    public string ApiKey { get; init; } = "";

    /// <summary>Signs payment requests and verifies webhook notifications.</summary>
    public string ChecksumKey { get; init; } = "";
    public string BaseUrl { get; init; } = "https://api-merchant.payos.vn";

    /// <summary>Where PayOS sends the user after paying or cancelling (the FE wallet page).</summary>
    public string ReturnUrl { get; init; } = "";
    public string CancelUrl { get; init; } = "";

    public bool CanCreateLinks =>
        !string.IsNullOrEmpty(ClientId)
        && !string.IsNullOrEmpty(ApiKey)
        && !string.IsNullOrEmpty(ChecksumKey)
        && !string.IsNullOrEmpty(ReturnUrl)
        && !string.IsNullOrEmpty(CancelUrl);

    public bool CanVerifyNotices => !string.IsNullOrEmpty(ChecksumKey);
}
