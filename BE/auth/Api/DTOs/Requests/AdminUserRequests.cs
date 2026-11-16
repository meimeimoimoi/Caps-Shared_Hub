using System.ComponentModel.DataAnnotations;

namespace Caps.Auth.Api.DTOs.Requests;

/// <summary>Why the account is being locked; shown to the next admin who opens it.</summary>
public sealed record SuspendUserRequest([Required, MaxLength(500)] string Reason);
