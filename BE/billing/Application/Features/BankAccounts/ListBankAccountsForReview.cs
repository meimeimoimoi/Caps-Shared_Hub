using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.BankAccounts;

/// <summary>Linked bank accounts for staff review, optionally only those in one status (e.g. UNVERIFIED).</summary>
public sealed record ListBankAccountsForReviewQuery(string? Status, int Page, int PageSize);

/// <summary>Newest first, with the full numbers decrypted for the page only.</summary>
public sealed class ListBankAccountsForReviewHandler(
    IBankAccountRepository accounts,
    IAccountNumberProtector protector
) : IQueryHandler<ListBankAccountsForReviewQuery, ReviewBankAccountPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<ReviewBankAccountPageResponse> HandleAsync(
        ListBankAccountsForReviewQuery query,
        CancellationToken ct
    )
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? null
            : query.Status.Trim().ToUpperInvariant();
        var total = await accounts.CountByStatusAsync(status, ct);
        var page = await accounts.ListByStatusAsync(
            status,
            (query.Page - 1) * query.PageSize,
            query.PageSize,
            ct
        );
        var items = page.Select(x =>
                ReviewBankAccountResponse.From(x, protector.Reveal(x.AccountNumberEnc))
            )
            .ToArray();
        return new ReviewBankAccountPageResponse(items, query.Page, query.PageSize, total);
    }
}
