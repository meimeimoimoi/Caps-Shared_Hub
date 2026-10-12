namespace auth.Services;

public sealed class AuthOptions
{
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 7;
    public int VerificationMinutes { get; set; } = 1440;

    /// <summary>Mã 6 số trong email xác nhận: hạn ngắn và giới hạn số lần nhập sai vì dễ đoán hơn link.</summary>
    public int VerificationCodeMinutes { get; set; } = 10;
    public int MaxCodeAttempts { get; set; } = 5;
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
