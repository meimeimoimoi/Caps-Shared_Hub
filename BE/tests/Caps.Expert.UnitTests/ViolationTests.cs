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

    // The expert asks in the system within 2 days of the violation, once; the admin excuses or declines
    [Fact]
    public void The_expert_asks_once_and_the_request_waits_for_the_admin()
    {
        var violation = Late();

        violation.RequestExcuse("  In hospital since Friday  ", [], Now);

        Assert.Equal(
            ("In hospital since Friday", Now),
            (violation.ExcuseRequest, violation.ExcuseRequestedAt)
        );
        Assert.True(violation.ExcusePending);
        Assert.Equal(
            "VIOLATION_EXCUSE_ALREADY_REQUESTED",
            Errors.CodeOf(() => violation.RequestExcuse("Again", [], Now))
        );
    }

    [Fact]
    public void An_excuse_is_asked_within_two_days_of_the_violation() =>
        Assert.Equal(
            "VIOLATION_EXCUSE_REQUEST_CLOSED",
            Errors.CodeOf(() => Late().RequestExcuse("Too late", [], Now.AddDays(1).AddMinutes(1)))
        );

    [Fact]
    public void An_excuse_request_needs_a_reason() =>
        Assert.Equal(
            "VIOLATION_EXCUSE_REASON_REQUIRED",
            Errors.CodeOf(() => Late().RequestExcuse("  ", [], Now))
        );

    [Fact]
    public void A_declined_request_keeps_the_points_and_is_not_pending()
    {
        var violation = Late();
        violation.RequestExcuse("Power cut", [], Now);

        violation.DeclineExcuse(Now.AddHours(1));

        Assert.Equal(Now.AddHours(1), violation.ExcuseDeclinedAt);
        Assert.Null(violation.ExcusedAt);
        Assert.False(violation.ExcusePending);
    }

    [Fact]
    public void Only_a_pending_request_can_be_declined()
    {
        Assert.Equal(
            "VIOLATION_EXCUSE_NOT_REQUESTED",
            Errors.CodeOf(() => Late().DeclineExcuse(Now))
        );
        var excused = Late();
        excused.RequestExcuse("Flood", [], Now);
        excused.Excuse(Admin, "Flood checked", 0, Now);

        Assert.False(excused.ExcusePending);
        Assert.Equal(
            "VIOLATION_EXCUSE_NOT_REQUESTED",
            Errors.CodeOf(() => excused.DeclineExcuse(Now))
        );
    }

    // Evidence (hospital note, outage notice) is uploaded with the request, at most 5 files
    [Fact]
    public void An_excuse_request_keeps_its_evidence_files()
    {
        var violation = Late();
        var note = ExcuseFile.Create(
            violation.ReviewCaseId,
            "giay-nhap-vien.pdf",
            "application/pdf",
            12_345
        );

        violation.RequestExcuse("In hospital", [note], Now);

        Assert.Equal([note], violation.ExcuseFiles);
        Assert.Equal($"violations/{violation.ReviewCaseId}/{note.Id}", note.StorageKey);
    }

    [Fact]
    public void An_excuse_request_has_at_most_five_files()
    {
        var files = Enumerable
            .Range(1, ViolationRules.MaxExcuseFiles + 1)
            .Select(i => ExcuseFile.Create(Guid.NewGuid(), $"f{i}.pdf", "application/pdf", 1))
            .ToList();

        Assert.Equal(
            "VIOLATION_EXCUSE_FILE_LIMIT",
            Errors.CodeOf(() => Late().RequestExcuse("Flood", files, Now))
        );
    }
}
