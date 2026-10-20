using Caps.Auth.Domain.Sessions;
using Caps.Auth.Domain.Verification;

namespace Caps.Auth.UnitTests;

public sealed class TokenTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Refresh_token_expires_at_its_expiry_time()
    {
        var token = AuthRefreshToken.Issue(Guid.NewGuid(), "hash", Now, Now.AddDays(7), null);

        Assert.False(token.IsExpired(Now.AddDays(7).AddSeconds(-1)));
        Assert.True(token.IsExpired(Now.AddDays(7)));
    }

    [Fact]
    public void Revoking_a_refresh_token_twice_keeps_the_first_time()
    {
        var token = AuthRefreshToken.Issue(Guid.NewGuid(), "hash", Now, Now.AddDays(7), null);

        token.Revoke(Now);
        token.Revoke(Now.AddHours(1));

        Assert.True(token.IsRevoked);
        Assert.Equal(Now, token.RevokedAt);
    }

    [Fact]
    public void Verification_token_is_unusable_once_used_or_expired()
    {
        var token = NewVerificationToken();
        Assert.True(token.IsUsable(Now));
        Assert.False(token.IsUsable(Now.AddMinutes(30)));

        token.MarkUsed(Now);
        Assert.False(token.IsUsable(Now));
    }

    [Fact]
    public void Verification_code_attempts_run_out_at_the_limit()
    {
        var token = NewVerificationToken();

        token.RecordFailedAttempt();
        token.RecordFailedAttempt();
        Assert.False(token.AttemptsExhausted(maxAttempts: 3));

        token.RecordFailedAttempt();
        Assert.True(token.AttemptsExhausted(maxAttempts: 3));
    }

    private static VerificationToken NewVerificationToken() =>
        VerificationToken.Create(
            Guid.NewGuid(),
            VerificationPurpose.VerifyEmail,
            "hash",
            Now,
            Now.AddMinutes(30)
        );
}
