using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.UnitTests;

public sealed class UserTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero);

    private static User NewUser(string? displayName = "Test User") =>
        User.Register("  Someone@Caps.Test ", displayName, "hash", Now);

    [Fact]
    public void Register_normalizes_the_email_and_waits_for_verification()
    {
        var user = NewUser();

        Assert.Equal("someone@caps.test", user.Email);
        Assert.Equal(UserStatus.PendingVerification, user.Status);
        Assert.True(user.CanSignIn);
        Assert.False(user.IsActive);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Register_without_a_name_uses_the_email_local_part(string? displayName)
    {
        Assert.Equal("someone", NewUser(displayName).FullName);
    }

    [Fact]
    public void Failed_logins_lock_the_account_at_the_limit_and_restart_the_count()
    {
        var user = NewUser();

        user.RecordFailedLogin(maxAttempts: 3, TimeSpan.FromMinutes(15), Now);
        user.RecordFailedLogin(maxAttempts: 3, TimeSpan.FromMinutes(15), Now);
        Assert.False(user.IsLockedOut(Now));

        user.RecordFailedLogin(maxAttempts: 3, TimeSpan.FromMinutes(15), Now);
        Assert.True(user.IsLockedOut(Now.AddMinutes(14)));
        Assert.False(user.IsLockedOut(Now.AddMinutes(15)));
        Assert.Equal(0, user.FailedLoginAttempts);
    }

    [Fact]
    public void Successful_login_clears_failures_and_stores_a_rehashed_password()
    {
        var user = NewUser();
        user.RecordFailedLogin(maxAttempts: 5, TimeSpan.FromMinutes(15), Now);

        user.RecordSuccessfulLogin("new-hash");

        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Equal("new-hash", user.PasswordHash);
    }

    [Fact]
    public void Password_reset_also_lifts_a_lockout()
    {
        var user = NewUser();
        user.RecordFailedLogin(maxAttempts: 1, TimeSpan.FromMinutes(15), Now);

        user.ResetPassword("reset-hash", Now);

        Assert.False(user.IsLockedOut(Now));
        Assert.Equal("reset-hash", user.PasswordHash);
    }

    [Fact]
    public void Verifying_the_email_activates_the_account_only_once()
    {
        var user = NewUser();

        user.VerifyEmail(Now);
        var again = Assert.Throws<AppException>(() => user.VerifyEmail(Now));

        Assert.True(user.IsActive);
        Assert.Equal(Now, user.EmailVerifiedAt);
        Assert.Equal("ALREADY_VERIFIED", again.Code);
    }

    [Fact]
    public void Revoking_all_sessions_moves_the_token_version_forward()
    {
        var user = NewUser();
        var before = user.TokenVersion;

        user.RevokeAllSessions();

        Assert.Equal(before + 1, user.TokenVersion);
    }

    [Fact]
    public void Profile_update_trims_the_name_and_phone()
    {
        var user = NewUser();

        user.UpdateProfile("  New Name ", " +84901234567 ", Now);

        Assert.Equal("New Name", user.FullName);
        Assert.Equal("+84901234567", user.Phone);
    }

    [Fact]
    public void Google_registration_starts_active_without_a_password()
    {
        var user = User.RegisterWithGoogle(" Someone@Gmail.com ", "Google User", "sub-1", Now);

        Assert.Equal("someone@gmail.com", user.Email);
        Assert.True(user.IsActive);
        Assert.Equal(Now, user.EmailVerifiedAt);
        Assert.False(user.HasPassword);
        Assert.Equal("sub-1", user.GoogleSubject);
    }

    [Fact]
    public void Linking_google_verifies_a_pending_account()
    {
        var user = NewUser();

        user.LinkGoogle("sub-1", Now);

        Assert.True(user.IsActive);
        Assert.Equal(Now, user.EmailVerifiedAt);
        Assert.Equal("sub-1", user.GoogleSubject);
    }

    [Fact]
    public void An_account_cannot_be_linked_to_a_second_google_account()
    {
        var user = NewUser();
        user.LinkGoogle("sub-1", Now);

        user.LinkGoogle("sub-1", Now);
        var other = Assert.Throws<AppException>(() => user.LinkGoogle("sub-2", Now));

        Assert.Equal("INVALID_CREDENTIALS", other.Code);
        Assert.Equal("sub-1", user.GoogleSubject);
    }
}
