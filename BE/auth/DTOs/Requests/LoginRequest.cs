using System.ComponentModel.DataAnnotations;
namespace auth.DTOs.Requests;
public sealed record LoginRequest([Required, EmailAddress, MaxLength(256)] string Email, [Required, MaxLength(128)] string Password);
public sealed record RegisterRequest([Required, EmailAddress, MaxLength(256)] string Email, [Required, MinLength(12), MaxLength(128)] string Password, [MaxLength(128)] string? DisplayName = null);
public sealed record EmailRequest([Required, EmailAddress, MaxLength(256)] string Email);
public sealed record TokenRequest([Required, MaxLength(256)] string Token);
public sealed record ResetPasswordRequest([Required, MaxLength(256)] string Token, [Required, MinLength(12), MaxLength(128)] string Password);
public sealed record UpdateProfileRequest([Required, MaxLength(128)] string DisplayName, [Phone, MaxLength(32)] string? Phone);
public sealed record BusinessProfileRequest([Required, MaxLength(256)] string CompanyName, [Required, RegularExpression(@"^\d{10}(?:-?\d{3})?$")] string TaxCode, [MaxLength(512)] string? Address, [MaxLength(128)] string? Representative, [EmailAddress, MaxLength(256)] string? ContactEmail, [Phone, MaxLength(32)] string? ContactPhone);
