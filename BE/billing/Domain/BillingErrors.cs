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

    public static AppException InvalidAmount() =>
        new(ErrorType.Validation, "INVALID_AMOUNT", "Amount must be positive.");

    public static AppException InvalidTopupAmount(long min, long max) =>
        new(
            ErrorType.Validation,
            "INVALID_TOPUP_AMOUNT",
            $"Top-up amount must be between {min} and {max} VND."
        );

    public static AppException PaymentUnavailable() =>
        new(
            ErrorType.Unavailable,
            "PAYMENT_UNAVAILABLE",
            "The payment provider is not available right now."
        );

    public static AppException PaymentConflict() =>
        new(ErrorType.Conflict, "PAYMENT_CONFLICT", "Could not start the payment, please retry.");

    public static AppException InvalidWebhookSignature() =>
        new(
            ErrorType.Validation,
            "INVALID_WEBHOOK_SIGNATURE",
            "The payment notification is malformed or its signature is invalid."
        );

    public static AppException PaymentAlreadySucceeded() =>
        new(ErrorType.Conflict, "PAYMENT_ALREADY_SUCCEEDED", "The payment has already succeeded.");

    public static AppException InsufficientCredits() =>
        new(ErrorType.Conflict, "INSUFFICIENT_CREDITS", "The wallet balance is not enough.");

    public static AppException EscrowNotFound() =>
        new(ErrorType.NotFound, "ESCROW_NOT_FOUND", "No escrow exists for this review case.");

    public static AppException EscrowAlreadyExists() =>
        new(
            ErrorType.Conflict,
            "ESCROW_ALREADY_EXISTS",
            "Credits are already held for this review case."
        );

    public static AppException EscrowNotHeld() =>
        new(ErrorType.Conflict, "ESCROW_NOT_HELD", "The escrow has already been settled.");

    public static AppException InvalidPlatformFee() =>
        new(
            ErrorType.Validation,
            "INVALID_PLATFORM_FEE",
            "The platform fee must be between 0 and 100 percent."
        );

    public static AppException PaymentAmountMismatch() =>
        new(
            ErrorType.Conflict,
            "PAYMENT_AMOUNT_MISMATCH",
            "The paid amount does not match the payment."
        );
}
