using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>Business error codes of the billing service; the FE relies on these codes.</summary>
public static class BillingErrors
{
    public static AppException InvalidPaging(int maxPageSize) =>
        new(
            ErrorType.Validation,
            "INVALID_PAGING",
            $"page must be at least 1 and pageSize between 1 and {maxPageSize}."
        );
}
