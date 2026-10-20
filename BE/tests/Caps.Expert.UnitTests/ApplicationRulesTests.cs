using System.Text;
using Caps.Common.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class ApplicationRulesTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero);
    private static readonly byte[] Pdf = Encoding.ASCII.GetBytes("%PDF-1.7 minimal");

    [Fact]
    public void A_pdf_is_accepted_and_its_type_comes_from_the_bytes()
    {
        Assert.Equal(FileSignature.Pdf, ApplicationRules.ValidateFile("CV", Pdf));
    }

    [Theory]
    [InlineData("EV-99", "INVALID_EVIDENCE_CODE")]
    [InlineData("CV", "EVIDENCE_INVALID_TYPE")]
    public void Unknown_groups_and_unsupported_formats_are_rejected(string code, string error)
    {
        // An SVG renamed to .pdf: the extension is ignored, the bytes decide
        var svg = Encoding.ASCII.GetBytes("<svg onload=alert(1)>");

        var content = code == "CV" ? svg : Pdf;

        Assert.Equal(error, Errors.CodeOf(() => ApplicationRules.ValidateFile(code, content)));
    }

    [Fact]
    public void Empty_and_oversized_files_are_rejected()
    {
        var tooLarge = new byte[ApplicationRules.MaxFileBytes + 1];
        Pdf.CopyTo(tooLarge, 0);

        Assert.Equal(
            "EVIDENCE_REQUIRED",
            Errors.CodeOf(() => ApplicationRules.ValidateFile("CV", []))
        );
        Assert.Equal(
            "EVIDENCE_TOO_LARGE",
            Errors.CodeOf(() => ApplicationRules.ValidateFile("CV", tooLarge))
        );
    }

    [Fact]
    public void An_unverified_account_can_hold_only_a_few_files()
    {
        var max = ApplicationRules.MaxFilesBeforeVerification;

        ApplicationRules.EnsureRoomForFile(max - 1, emailVerified: false);
        Assert.Equal(
            "EVIDENCE_LIMIT_UNVERIFIED",
            Errors.CodeOf(() => ApplicationRules.EnsureRoomForFile(max, emailVerified: false))
        );
    }

    [Fact]
    public void A_verified_account_can_fill_the_whole_application()
    {
        var max = ApplicationRules.MaxFilesPerApplication;

        ApplicationRules.EnsureRoomForFile(max - 1, emailVerified: true);
        Assert.Equal(
            "EVIDENCE_LIMIT",
            Errors.CodeOf(() => ApplicationRules.EnsureRoomForFile(max, emailVerified: true))
        );
    }

    [Fact]
    public void Fields_are_trimmed_and_deduplicated_and_unknown_ones_rejected()
    {
        Assert.Equal(["AUDIT"], ApplicationRules.NormalizeFields([" AUDIT ", "AUDIT"]));
        Assert.Equal(
            "INVALID_FIELD",
            Errors.CodeOf(() => ApplicationRules.NormalizeFields(["COOKING"]))
        );
    }

    [Fact]
    public void A_birth_date_in_the_future_is_rejected()
    {
        var tomorrow = DateOnly.FromDateTime(Now.UtcDateTime).AddDays(1);

        Assert.Equal(
            "INVALID_BIRTH_DATE",
            Errors.CodeOf(() => ApplicationRules.ValidateBirthDate(tomorrow, Now))
        );
    }

    [Fact]
    public void A_profile_lists_what_is_missing_before_submission()
    {
        var profile = ExpertProfile.Create(Guid.NewGuid(), "applicant", Now);

        Assert.Equal(
            ["phone", "yearsExperience", "fields", "CV"],
            profile.MissingRequirements(hasCv: false)
        );

        profile.UpdateDetails(
            new ProfileDetails(
                DisplayName: null,
                Phone: "+84901234567",
                BirthDate: null,
                Title: null,
                Company: null,
                Location: null,
                Bio: null,
                YearsExperience: 5,
                Fields: ["AUDIT"],
                Highlights: null
            ),
            Now
        );
        Assert.Empty(profile.MissingRequirements(hasCv: true));
        Assert.Equal("applicant", profile.DisplayName);
    }
}
