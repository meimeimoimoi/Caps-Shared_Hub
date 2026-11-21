using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

// Force majeure (2026-11-20): a System Admin excuses a violation with a reason, at most twice in 90 days
public class ViolationTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 21, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Admin = Guid.NewGuid();

    private static ExpertViolation Late() =>
        ExpertViolation.Record(Guid.NewGuid(), Guid.NewGuid(), "LATE", Now.AddDays(-1));

    [Fact]
    public void An_excused_violation_keeps_who_why_and_when()
    {
        var violation = Late();

        violation.Excuse(Admin, "  Hospitalised, certificate checked  ", 0, Now);

        Assert.Equal(
            (Now, Admin, "Hospitalised, certificate checked"),
            (violation.ExcusedAt, violation.ExcusedBy, violation.ExcusedReason)
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void An_excuse_needs_a_reason(string? reason) =>
        Assert.Equal(
            "VIOLATION_EXCUSE_REASON_REQUIRED",
            Errors.CodeOf(() => Late().Excuse(Admin, reason, 0, Now))
        );

    [Fact]
    public void A_violation_is_excused_once()
    {
        var violation = Late();
        violation.Excuse(Admin, "Power cut", 0, Now);

        Assert.Equal(
            "VIOLATION_ALREADY_EXCUSED",
            Errors.CodeOf(() => violation.Excuse(Admin, "Again", 1, Now))
        );
    }

    [Fact]
    public void A_third_excuse_within_ninety_days_is_refused()
    {
        var violation = Late();

        Assert.Equal(
            "VIOLATION_EXCUSE_LIMIT",
            Errors.CodeOf(() => violation.Excuse(Admin, "Flood", ViolationRules.MaxExcuses, Now))
        );
        Assert.Null(violation.ExcusedAt);
    }
}
