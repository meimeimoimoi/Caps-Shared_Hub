using System.Text.Json;
using Caps.Auth.Application.Abstractions.Email;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Contracts;
using Microsoft.AspNetCore.DataProtection;

namespace Caps.Auth.Infrastructure.Email;

/// <summary>Writes the email request encrypted, since it carries one-time links and codes.</summary>
public sealed class AuthEmailOutboxWriter(
    AuthDbContext db,
    IDataProtectionProvider protection,
    TimeProvider clock
) : IAuthEmailOutbox
{
    /// <summary>Shared with <see cref="AuthEmailPublisher"/>, which decrypts the payload.</summary>
    public const string ProtectorPurpose = "AuthEmailOutbox.v1";

    private readonly IDataProtector protector = protection.CreateProtector(ProtectorPurpose);

    public void Enqueue(AuthEmailRequestedEvent message) =>
        db.EmailOutbox.Add(
            new AuthEmailOutbox
            {
                Id = message.Id,
                ProtectedPayload = protector.Protect(JsonSerializer.Serialize(message)),
                CreatedAt = clock.GetUtcNow(),
            }
        );
}
