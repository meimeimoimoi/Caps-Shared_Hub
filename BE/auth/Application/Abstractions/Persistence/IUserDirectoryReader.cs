using Caps.Auth.Application.DTOs.Responses;

namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>Read side of the System Admin's account list; nothing is tracked.</summary>
public interface IUserDirectoryReader
{
    /// <summary>
    /// One page of accounts, newest first. <paramref name="search"/> matches part of the email or the name,
    /// ignoring case; <paramref name="status"/> keeps one account status.
    /// </summary>
    Task<ManagedUserPageResponse> ListAsync(
        string? search,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct
    );

    /// <summary>One account as the list shows it, or null when the id is unknown.</summary>
    Task<ManagedUserResponse?> FindAsync(Guid userId, CancellationToken ct);
}
