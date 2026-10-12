namespace Caps.Auth.Application;

public sealed class AuthOptions
{
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 7;
    public int VerificationMinutes { get; set; } = 1440;

    /// <summary>6-digit code in the verification email: short expiry and limited attempts, since it is easier to guess than a link.</summary>
    public int VerificationCodeMinutes { get; set; } = 10;
    public int MaxCodeAttempts { get; set; } = 5;
    public int ResetMinutes { get; set; } = 30;
    public int EmailCooldownSeconds { get; set; } = 60;
    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public string FrontendUrl { get; set; } = "http://localhost:5173";
    public bool SecureCookie { get; set; } = true;
}
