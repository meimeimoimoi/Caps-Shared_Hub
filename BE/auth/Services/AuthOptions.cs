namespace auth.Services;
public sealed class AuthOptions
{
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 7;
    public int VerificationMinutes { get; set; } = 1440;
    public int ResetMinutes { get; set; } = 30;
    public int EmailCooldownSeconds { get; set; } = 60;
    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public string FrontendUrl { get; set; } = "http://localhost:5173";
    public bool SecureCookie { get; set; } = true;
}
public sealed class AuthFailure(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
