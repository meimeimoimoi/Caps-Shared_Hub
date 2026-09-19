using System.ComponentModel.DataAnnotations;

namespace auth.DTOs.Requests;

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password);

public sealed record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? DisplayName = null);
