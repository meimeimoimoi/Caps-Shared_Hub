using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.BankAccounts;
using Caps.Billing.Domain;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Links a bank account; the domain validates the values themselves (digits, BIN format).</summary>
/// <param name="BankBin">6-digit bank code (VietQR BIN), e.g. 970436 for Vietcombank.</param>
/// <param name="AccountNumber">6–19 digits; spaces and dashes are ignored.</param>
/// <param name="IsDefault">Makes this the default payout account (the first account always is).</param>
public sealed record AddBankAccountRequest(
    [Required, MaxLength(6)] string? BankBin,
    [Required, MaxLength(BankAccountRules.MaxNameLength)] string? BankName,
    [Required, MaxLength(32)] string? AccountNumber,
    [Required, MaxLength(BankAccountRules.MaxNameLength)] string? AccountHolderName,
    bool IsDefault = false
)
{
    public AddBankAccountCommand ToCommand(Guid userId) =>
        new(userId, BankBin, BankName, AccountNumber, AccountHolderName, IsDefault);
}
