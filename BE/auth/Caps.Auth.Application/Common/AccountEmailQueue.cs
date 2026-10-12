using Caps.Auth.Application.Abstractions.Email;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Contracts;

namespace Caps.Auth.Application.Common;

public interface IAccountEmailQueue
{
    /// <summary>
    /// Replaces any unused token of the purpose and queues the email (verification or password reset).
    /// Throws EMAIL_COOLDOWN when one was requested too recently.
    /// </summary>
    Task QueueAsync(User user, string purpose, CancellationToken ct);
}

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
            throw new AuthFailure(
                429,
                "EMAIL_COOLDOWN",
                "Please wait before requesting another email."
            );
        await tokens.InvalidateUnusedAsync(user.Id, purpose, now, ct);
        var raw = OpaqueTokens.NewSecret();
        var isVerify = purpose == VerificationPurpose.VerifyEmail;
        var expires = now.AddMinutes(isVerify ? options.VerificationMinutes : options.ResetMinutes);
        tokens.Add(
            new VerificationToken
            {
                UserId = user.Id,
                Purpose = purpose,
                TokenHash = OpaqueTokens.Hash(raw),
                CreatedAt = now,
                ExpiresAt = expires,
            }
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
                new VerificationToken
                {
                    UserId = user.Id,
                    Purpose = VerificationPurpose.VerifyEmailCode,
                    TokenHash = OpaqueTokens.HashCode(user.Id, code),
                    CreatedAt = now,
                    ExpiresAt = codeExpires.Value,
                }
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
