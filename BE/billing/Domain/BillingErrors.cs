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

    public static AppException InvalidBankAccount(string field) =>
        new(ErrorType.Validation, "INVALID_BANK_ACCOUNT", $"Invalid bank account field: {field}.");

    public static AppException BankAccountNotFound() =>
        new(ErrorType.NotFound, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found.");

    public static AppException BankAccountDuplicate() =>
        new(ErrorType.Conflict, "BANK_ACCOUNT_DUPLICATE", "This bank account is already linked.");

    public static AppException BankAccountLimit(int max) =>
        new(
            ErrorType.Conflict,
            "BANK_ACCOUNT_LIMIT",
            $"At most {max} bank accounts can be linked."
        );
}
