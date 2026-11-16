namespace Caps.Auth.Application.DTOs.Responses;

/// <summary>One account as the System Admin sees it.</summary>
/// <param name="Roles">Role codes, e.g. USER, EXPERT.</param>
/// <param name="LastSignInAt">When the newest session started; null when the account never signed in.</param>
/// <param name="SuspendedReason">Why the account is locked; null unless Status is SUSPENDED.</param>
public sealed record ManagedUserResponse(
    string Id,
    string Email,
    string FullName,
    string[] Roles,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSignInAt,
    string? SuspendedReason,
    DateTimeOffset? SuspendedAt
);

/// <summary>A page of accounts, newest first.</summary>
public sealed record ManagedUserPageResponse(
    ManagedUserResponse[] Items,
    int Page,
    int PageSize,
    int Total
);
