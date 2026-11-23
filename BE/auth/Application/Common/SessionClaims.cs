namespace Caps.Auth.Application.Common;

/// <summary>Claims a signed access token carries about the account at the time it was issued.</summary>
public sealed record SessionClaims(Guid UserId, string? TokenVersion, string? AccountStatus);
