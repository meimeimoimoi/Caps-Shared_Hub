using System.ComponentModel.DataAnnotations;

namespace Caps.Auth.Api.DTOs.Requests;

/// <summary>Why the account is being locked; shown to the next admin who opens it.</summary>
public sealed record SuspendUserRequest([Required, MaxLength(500)] string Reason);

/// <summary>Why the account is being unlocked; kept in the audit trail.</summary>
public sealed record ReinstateUserRequest([Required, MaxLength(500)] string Reason);

/// <summary>Why a password reset email is being sent; kept in the audit trail.</summary>
public sealed record SendUserPasswordResetRequest([Required, MaxLength(500)] string Reason);
