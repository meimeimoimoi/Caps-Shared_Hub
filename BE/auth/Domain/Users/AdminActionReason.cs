namespace Caps.Auth.Domain.Users;

/// <summary>
/// The reason a System Admin gives for locking, unlocking or resetting an account. One rule for all three, so
/// every audited account action explains itself.
/// </summary>
public static class AdminActionReason
{
    public const int MinLength = 10;

    /// <summary>Returns the trimmed reason, or throws ADMIN_REASON_TOO_SHORT when it is missing or too short.</summary>
    public static string Require(string? reason)
    {
        var trimmed = reason?.Trim() ?? "";
        if (trimmed.Length < MinLength)
            throw AuthErrors.AdminReasonTooShort(MinLength);
        return trimmed;
    }
}
