using Caps.Auth.Application.Abstractions.Email;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Contracts;

namespace Caps.Auth.Application.Common;

/// <summary>Sends account emails (verification, password reset) through the outbox, with a cooldown.</summary>
public interface IAccountEmailQueue
{
    /// <summary>
    /// Replaces any unused token of the purpose and queues the email (verification or password reset).
    /// Throws EMAIL_COOLDOWN when one was requested too recently.
    /// </summary>
    Task QueueAsync(User user, string purpose, CancellationToken ct);
}

/// <summary>Creates the token, replaces older unused ones and writes the email to the outbox.</summary>
public sealed class AccountEmailQueue(
    IVerificationTokenRepository tokens,
    IAuthEmailOutbox outbox,
    AuthOptions options,
    TimeProvider clock
) : IAccountEmailQueue
{
    public async Task QueueAsync(User user, string purpose, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        if (
            await tokens.AnyCreatedSinceAsync(
                user.Id,
                purpose,
                now.AddSeconds(-options.EmailCooldownSeconds),
                ct
            )
        )
        {
            throw AuthErrors.EmailCooldown();
        }

        await tokens.InvalidateUnusedAsync(user.Id, purpose, now, ct);
        var raw = OpaqueTokens.NewSecret();
        var isVerify = purpose == VerificationPurpose.VerifyEmail;
        var expires = now.AddMinutes(isVerify ? options.VerificationMinutes : options.ResetMinutes);
        tokens.Add(
            VerificationToken.Create(user.Id, purpose, OpaqueTokens.Hash(raw), now, expires)
        );
        string? code = null;
        DateTimeOffset? codeExpires = null;
        if (isVerify)
        {
            // Include a 6-digit code so the user can enter it on the open page instead of following the link
            await tokens.InvalidateUnusedAsync(
                user.Id,
                VerificationPurpose.VerifyEmailCode,
                now,
                ct
            );
            code = OpaqueTokens.NewCode();
            codeExpires = now.AddMinutes(options.VerificationCodeMinutes);
            tokens.Add(
                VerificationToken.Create(
                    user.Id,
                    VerificationPurpose.VerifyEmailCode,
                    OpaqueTokens.HashCode(user.Id, code),
                    now,
                    codeExpires.Value
                )
            );
        }
        var path = isVerify ? "/verify-email" : "/reset-password";
        outbox.Enqueue(
            new AuthEmailRequestedEvent(
                Guid.NewGuid(),
                user.Email,
                purpose,
                options.FrontendUrl.TrimEnd('/') + path + "?token=" + raw,
                expires,
                code,
                codeExpires
            )
        );
    }
}
