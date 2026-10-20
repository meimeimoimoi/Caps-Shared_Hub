using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Encrypts an account number and derives the keyed hash used to detect duplicates.</summary>
public interface IAccountNumberProtector
{
    /// <summary>Expects a number normalized by <see cref="BankAccountRules.NormalizeAccountNumber"/>.</summary>
    ProtectedAccountNumber Protect(string normalizedNumber);
}
