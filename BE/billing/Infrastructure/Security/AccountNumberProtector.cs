using System.Security.Cryptography;
using System.Text;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.AspNetCore.DataProtection;

namespace Caps.Billing.Infrastructure.Security;

/// <summary>Secret for the account number hash; registered by the host from configuration.</summary>
public sealed class AccountNumberProtectionOptions
{
    public const int MinHashKeyLength = 32;

    public string HashKey { get; init; } = "";
}

/// <summary>
/// Encrypts with ASP.NET Data Protection (keys can rotate, old ciphertext stays readable) and hashes with
/// HMAC-SHA256, so equal numbers give equal hashes for duplicate checks without exposing the number.
/// </summary>
public sealed class AccountNumberProtector : IAccountNumberProtector
{
    private const string Purpose = "Caps.Billing.BankAccountNumber.v1";

    private readonly IDataProtector protector;
    private readonly byte[] hashKey;

    public AccountNumberProtector(
        IDataProtectionProvider provider,
        AccountNumberProtectionOptions options
    )
    {
        if (options.HashKey.Length < AccountNumberProtectionOptions.MinHashKeyLength)
        {
            throw new InvalidOperationException(
                $"Billing:AccountHashKey must be at least {AccountNumberProtectionOptions.MinHashKeyLength} characters."
            );
        }
        protector = provider.CreateProtector(Purpose);
        hashKey = Encoding.UTF8.GetBytes(options.HashKey);
    }

    public ProtectedAccountNumber Protect(string normalizedNumber)
    {
        var hash = HMACSHA256.HashData(hashKey, Encoding.UTF8.GetBytes(normalizedNumber));
        return new ProtectedAccountNumber(
            protector.Protect(normalizedNumber),
            Convert.ToHexString(hash).ToLowerInvariant(),
            BankAccountRules.Last4(normalizedNumber)
        );
    }
}
