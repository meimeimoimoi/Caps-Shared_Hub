using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Users;

/// <summary>The System Admin's account list: one page, optionally searched and filtered by status.</summary>
public sealed record ListUsersQuery(string? Search, string? Status, int Page, int PageSize);

/// <summary>Reads the page; an empty search or status means no filter.</summary>
public sealed class ListUsersHandler(IUserDirectoryReader directory)
    : IQueryHandler<ListUsersQuery, ManagedUserPageResponse>
{
    public Task<ManagedUserPageResponse> HandleAsync(ListUsersQuery query, CancellationToken ct)
    {
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? null
            : query.Status.Trim().ToUpperInvariant();
        return directory.ListAsync(search, status, query.Page, query.PageSize, ct);
    }
}
