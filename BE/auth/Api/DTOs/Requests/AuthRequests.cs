using System.ComponentModel.DataAnnotations;
using Caps.Auth.Application.Features.Profile;

namespace Caps.Auth.Api.DTOs.Requests;

/// <summary>Body of POST /auth/login.</summary>
public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password,
    bool RememberMe = false
);

/// <summary>Body of POST /auth/google: the ID token (credential) from Google Identity Services.</summary>
public sealed record GoogleLoginRequest([Required, MaxLength(4096)] string IdToken);

/// <summary>Body of POST /auth/register; the display name is optional (falls back to the email's local part).</summary>
public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [
        Required,
        MinLength(8),
        MaxLength(128),
        RegularExpression(
            @"(?s)\A(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\p{L}\p{N}\s]).*\z",
            ErrorMessage = "Password must include uppercase and lowercase letters, a number and a special character."
        )
    ]
        string Password,
    [MaxLength(128)] string? DisplayName = null
);

/// <summary>Body of the endpoints that only need an email, e.g. forgot-password.</summary>
public sealed record EmailRequest([Required, EmailAddress, MaxLength(256)] string Email);

/// <summary>The 6-digit code from the verification email, typed on the open page.</summary>
public sealed record VerifyEmailCodeRequest([Required, RegularExpression(@"^\d{6}$")] string Code);

/// <summary>The token from an emailed link (verify-email).</summary>
public sealed record TokenRequest([Required, MaxLength(256)] string Token);

/// <summary>The token from the password reset email and the new password.</summary>
public sealed record ResetPasswordRequest(
    [Required, MaxLength(256)] string Token,
    [
        Required,
        MinLength(8),
        MaxLength(128),
        RegularExpression(
            @"(?s)\A(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\p{L}\p{N}\s]).*\z",
            ErrorMessage = "Password must include uppercase and lowercase letters, a number and a special character."
        )
    ]
        string Password
);

/// <summary>Change while signed in: the current password proves it is the account owner.</summary>
public sealed record ChangePasswordRequest(
    [Required, MaxLength(128)] string CurrentPassword,
    [
        Required,
        MinLength(8),
        MaxLength(128),
        RegularExpression(
            @"(?s)\A(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\p{L}\p{N}\s]).*\z",
            ErrorMessage = "Password must include uppercase and lowercase letters, a number and a special character."
        )
    ]
        string NewPassword
);

/// <summary>Editable profile fields of the signed-in account.</summary>
public sealed record UpdateProfileRequest(
    [Required, MaxLength(128)] string DisplayName,
    [Phone, MaxLength(32)] string? Phone
);

/// <summary>Company details of a customer account, used on invoices and documents.</summary>
public sealed record BusinessProfileRequest(
    [Required, MaxLength(256)] string CompanyName,
    [Required, RegularExpression(@"^\d{10}(?:-?\d{3})?$")] string TaxCode,
    [MaxLength(512)] string? Address,
    [MaxLength(128)] string? Representative,
    [EmailAddress, MaxLength(256)] string? ContactEmail,
    [Phone, MaxLength(32)] string? ContactPhone
)
{
    public UpdateBusinessProfileCommand ToCommand(Guid userId) =>
        new(userId, CompanyName, TaxCode, Address, Representative, ContactEmail, ContactPhone);
}
