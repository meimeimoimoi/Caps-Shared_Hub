using System.Text;
using Caps.Common.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class ApplicationRulesTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero);
    private static readonly byte[] Pdf = Encoding.ASCII.GetBytes("%PDF-1.7 minimal");

    [Theory]
    [InlineData(" https://www.linkedin.com/in/expert ", "https://www.linkedin.com/in/expert")]
    [InlineData("https://EXAMPLE.com", "https://example.com/")]
    [InlineData("http://example.com/cv.pdf?share=public", "http://example.com/cv.pdf?share=public")]
    public void Public_links_are_trimmed_and_normalized(string input, string expected)
    {
        Assert.Equal(expected, ApplicationRules.ValidateUrl(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("/cv.pdf")]
    [InlineData("javascript:alert(1)")]
    [InlineData("file:///cv.pdf")]
    [InlineData("ftp://example.com/cv.pdf")]
    [InlineData("https://user:password@example.com/cv")]
    [InlineData("http://localhost/cv")]
    [InlineData("http://a.localhost/cv")]
    [InlineData("http://server.local/cv")]
    [InlineData("http://server.internal/cv")]
    [InlineData("http://intranet/cv")]
    [InlineData("http://127.0.0.1/cv")]
    [InlineData("http://10.0.0.1/cv")]
    [InlineData("http://172.16.0.1/cv")]
    [InlineData("http://192.168.1.1/cv")]
    [InlineData("http://169.254.169.254/cv")]
    [InlineData("http://100.64.0.1/cv")]
    [InlineData("http://[::1]/cv")]
    [InlineData("http://[::ffff:127.0.0.1]/cv")]
    [InlineData("http://[fe80::1]/cv")]
    [InlineData("https://example.com/cv\n.pdf")]
    public void Missing_unsafe_or_local_links_are_rejected(string? input)
    {
        Assert.Equal(
            "EVIDENCE_INVALID_URL",
            Errors.CodeOf(() => ApplicationRules.ValidateUrl(input))
        );
    }

    [Fact]
    public void Oversized_links_are_rejected()
    {
        var url = "https://example.com/" + new string('a', 2048);
        Assert.Equal(
            "EVIDENCE_INVALID_URL",
            Errors.CodeOf(() => ApplicationRules.ValidateUrl(url))
        );
    }

    [Fact]
    public void A_cv_link_is_recorded_without_a_storage_object_and_can_be_removed_from_a_draft()
    {
        var userId = Guid.NewGuid();
        var application = ExpertApplication.Open(Guid.NewGuid(), null, userId, Now).Application;
        var evidence = ExpertEvidence.CreateFromUrl(
            application,
            userId,
            "CV",
            " https://example.com/cv ",
            Now
        );

        Assert.True(evidence.IsLink);
        Assert.Equal("https://example.com/cv", evidence.SourceUrl);
        Assert.Equal("CV", evidence.EvidenceType);
        Assert.Equal(application.Id, evidence.ApplicationId);
        Assert.Empty(evidence.FileUrl);
        Assert.Equal(0, evidence.SizeBytes);
        Assert.True(application.CanRemove(evidence));
        application.Submit(userId, Now.AddMinutes(1));
        Assert.False(application.CanRemove(evidence));
    }

    [Fact]
    public void The_link_factory_enforces_url_and_group_validation()
    {
        var userId = Guid.NewGuid();
        var application = ExpertApplication.Open(Guid.NewGuid(), null, userId, Now).Application;
        Assert.Equal(
            "EVIDENCE_INVALID_URL",
            Errors.CodeOf(() =>
                ExpertEvidence.CreateFromUrl(application, userId, "CV", "javascript:alert(1)", Now)
            )
        );
        Assert.Equal(
            "INVALID_EVIDENCE_CODE",
            Errors.CodeOf(() =>
                ExpertEvidence.CreateFromUrl(
                    application,
                    userId,
                    "EV-99",
                    "https://example.com",
                    Now
                )
            )
        );
    }

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
    public void An_application_holds_at_most_the_file_limit()
    {
        var max = ApplicationRules.MaxFilesPerApplication;

        ApplicationRules.EnsureRoomForFile(max - 1);
        Assert.Equal(
            "EVIDENCE_LIMIT",
            Errors.CodeOf(() => ApplicationRules.EnsureRoomForFile(max))
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
