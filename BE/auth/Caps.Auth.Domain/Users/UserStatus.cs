namespace Caps.Auth.Domain.Users;

/// <summary>Account statuses, also sent in the token's account_status claim.</summary>
public static class UserStatus
{
    public const string PendingVerification = "PENDING_VERIFICATION";
    public const string Active = "ACTIVE";
}

/// <summary>Role codes the code depends on.</summary>
public static class RoleCodes
{
    /// <summary>Role every account gets at sign-up.</summary>
    public const string User = "USER";
}
