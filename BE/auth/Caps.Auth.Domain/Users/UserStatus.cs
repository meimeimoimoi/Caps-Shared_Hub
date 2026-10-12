namespace Caps.Auth.Domain.Users;

public static class UserStatus
{
    public const string PendingVerification = "PENDING_VERIFICATION";
    public const string Active = "ACTIVE";
}

public static class RoleCodes
{
    /// <summary>Role every account gets at sign-up.</summary>
    public const string User = "USER";
}
