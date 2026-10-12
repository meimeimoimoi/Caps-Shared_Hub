namespace Caps.Auth.Domain.Verification;

public static class VerificationPurpose
{
    /// <summary>Link in the verification email.</summary>
    public const string VerifyEmail = "VERIFY_EMAIL";

    /// <summary>6-digit code in the same verification email.</summary>
    public const string VerifyEmailCode = "VERIFY_EMAIL_CODE";

    public const string ResetPassword = "RESET_PASSWORD";
}
