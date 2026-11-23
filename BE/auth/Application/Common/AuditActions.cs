namespace Caps.Auth.Application.Common;

/// <summary>Entity types and actions auth writes to the audit log. Released values are never renamed.</summary>
public static class AuditActions
{
    public const string User = "USER";

    public const string UserLocked = "USER_LOCKED";
    public const string UserUnlocked = "USER_UNLOCKED";
    public const string PasswordResetSent = "USER_PASSWORD_RESET_SENT";
}
