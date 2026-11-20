using Caps.Expert.Domain.Applications;
using Caps.Expert.Infrastructure.Ai;

namespace Caps.Expert.UnitTests;

public sealed class ScreeningEvaluatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 10, 0, 0, TimeSpan.FromHours(7));
    private static readonly Guid ApplicantId = Guid.NewGuid();
    private static readonly Guid ReviewerId = Guid.NewGuid();

    private static ExpertApplication MakeApplication() =>
        ExpertApplication.Open(Guid.NewGuid(), null, ApplicantId, Now).Application;

    private static ProfileSnapshot MakeSnapshot(
        string? name = "Nguyễn Minh Ánh",
        int? years = 8,
        string[]? fields = null
    ) =>
        new(
            name,
            "0901234567",
            null,
            "Tax Manager",
            "An Phat",
            "HCM",
            null,
            years,
            fields ?? ["CORPORATE_INCOME_TAX", "TAX_ADVISORY"],
            null,
            "minhanh@caps.test",
            []
        );

    [Fact]
    public void Only_gate1_cv_files_require_ai_extraction()
    {
        var app = MakeApplication();
        var cv = ExpertEvidence.Create(
            app,
            ApplicantId,
            "CV",
            "cv.pdf",
            "application/pdf",
            256,
            Now
        );
        var ev01 = ExpertEvidence.Create(
            app,
            ApplicantId,
            "EV-01",
            "id.jpg",
            "image/jpeg",
            128,
            Now
        );
        var ev02 = ExpertEvidence.Create(
            app,
            ApplicantId,
            "EV-02",
            "cert.pdf",
            "application/pdf",
            256,
            Now
        );
        var supplement = ExpertEvidence.Create(
            app,
            ApplicantId,
            "SUPPLEMENT",
            "extra_id.jpg",
            "image/jpeg",
            128,
            Now
        );
        supplement.AssignGroup("CV");
        var link = ExpertEvidence.CreateFromUrl(
            app,
            ApplicantId,
            "CV",
            "https://example.com/cv",
            Now
        );

        Assert.True(cv.RequiresAiExtraction);
        Assert.Equal(ExtractionStatuses.Pending, cv.ExtractionStatus);
        foreach (var nonCv in new[] { ev01, ev02, supplement, link })
        {
            Assert.False(nonCv.RequiresAiExtraction);
            Assert.Null(nonCv.ExtractionStatus);
        }
    }

    [Fact]
    public void Worker_extraction_filter_allows_only_gate1_cv_files_and_excludes_supplements()
    {
        var app = MakeApplication();
        var staleBefore = Now.AddMinutes(-3);

        var cvPending = ExpertEvidence.Create(
            app,
            ApplicantId,
            ApplicationRules.CvCode,
            "cv.pdf",
            "application/pdf",
            256,
            Now
        );
        var cvStaleProcessing = ExpertEvidence.Create(
            app,
            ApplicantId,
            ApplicationRules.CvCode,
            "cv-stale.pdf",
            "application/pdf",
            256,
            Now
        );
        cvStaleProcessing.MarkExtractionProcessing(staleBefore.AddMinutes(-1));

        var cvActiveProcessing = ExpertEvidence.Create(
            app,
            ApplicantId,
            ApplicationRules.CvCode,
            "cv-active.pdf",
            "application/pdf",
            256,
            Now
        );
        cvActiveProcessing.MarkExtractionProcessing(Now.AddSeconds(-30));

        var ev01 = ExpertEvidence.Create(
            app,
            ApplicantId,
            EligibilityCriteria.LegalEligibility,
            "cccd.jpg",
            "image/jpeg",
            128,
            Now
        );
        var ev02 = ExpertEvidence.Create(
            app,
            ApplicantId,
            EligibilityCriteria.ProfessionalQualification,
            "cert.pdf",
            "application/pdf",
            128,
            Now
        );
        var supplement = ExpertEvidence.Create(
            app,
            ApplicantId,
            ApplicationRules.SupplementCode,
            "supplement_cccd.jpg",
            "image/jpeg",
            128,
            Now
        );
        var supplementAssignedCv = ExpertEvidence.Create(
            app,
            ApplicantId,
            ApplicationRules.SupplementCode,
            "supplement_cv.pdf",
            "application/pdf",
            128,
            Now
        );
        supplementAssignedCv.AssignGroup(ApplicationRules.CvCode);
        var cvLink = ExpertEvidence.CreateFromUrl(
            app,
            ApplicantId,
            ApplicationRules.CvCode,
            "https://example.com/cv",
            Now
        );

        var predicate = EvidenceScreeningWorker.PendingExtractionFilter(staleBefore).Compile();

        Assert.True(predicate(cvPending));
        Assert.True(predicate(cvStaleProcessing));
        Assert.False(predicate(cvActiveProcessing));
        Assert.False(predicate(ev01));
        Assert.False(predicate(ev02));
        Assert.False(predicate(supplement));
        Assert.False(predicate(supplementAssignedCv));
        Assert.False(predicate(cvLink));

        Assert.True(EvidenceScreeningWorker.IsExtractableEvidenceType(ApplicationRules.CvCode));
        Assert.False(
            EvidenceScreeningWorker.IsExtractableEvidenceType(EligibilityCriteria.LegalEligibility)
        );
        Assert.False(
            EvidenceScreeningWorker.IsExtractableEvidenceType(
                EligibilityCriteria.ProfessionalQualification
            )
        );
        Assert.False(
            EvidenceScreeningWorker.IsExtractableEvidenceType(ApplicationRules.SupplementCode)
        );
    }

    [Fact]
    public void System_checks_flag_cv_images_links_near_threshold_and_unclassified_supplements()
    {
        var app = MakeApplication();
        var run = ScreeningRun.Start(
            app.Id,
            Guid.NewGuid(),
            1,
            1,
            ApplicantId,
            Now,
            TimeSpan.FromMinutes(10)
        );
        var imageCv = ExpertEvidence.Create(
            app,
            ApplicantId,
            "CV",
            "cv.png",
            "image/png",
            200,
            Now
        );
        var imageCert = ExpertEvidence.Create(
            app,
            ApplicantId,
            "EV-02",
            "cert.png",
            "image/png",
            200,
            Now
        );
        var ev01Photo = ExpertEvidence.Create(
            app,
            ApplicantId,
            "EV-01",
            "cccd.jpg",
            "image/jpeg",
            200,
            Now
        );
        var externalLink = ExpertEvidence.CreateFromUrl(
            app,
            ApplicantId,
            "CV",
            "https://example.com/profile",
            Now
        );
        var supplement = ExpertEvidence.Create(
            app,
            ApplicantId,
            "SUPPLEMENT",
            "extra_id.jpg",
            "image/jpeg",
            200,
            Now
        );

        var points = ScreeningEvaluator.EvaluateSystemChecks(
            run,
            MakeSnapshot(years: 6),
            [imageCv, imageCert, ev01Photo, externalLink, supplement],
            new Dictionary<Guid, EvidenceExtraction>(),
            new HashSet<Guid>(),
            minYearsExperience: 5,
            new ScreeningPolicy(1, TimeSpan.FromMinutes(10), true),
            Now
        );

        Assert.Contains(
            points,
            p => p.Code == ScreeningPointCodes.SysUnreadableOrScan && p.EvidenceId == imageCv.Id
        );
        Assert.DoesNotContain(points, p => p.EvidenceId == imageCert.Id);
        Assert.DoesNotContain(points, p => p.EvidenceId == ev01Photo.Id);
        Assert.DoesNotContain(
            points,
            p => p.Code == ScreeningPointCodes.SysUnreadableOrScan && p.EvidenceId == supplement.Id
        );
        Assert.Contains(
            points,
            p => p.Code == ScreeningPointCodes.SysExternalLink && p.EvidenceId == externalLink.Id
        );
        Assert.Contains(points, p => p.Code == ScreeningPointCodes.SysNearMinExperience);
        Assert.Contains(
            points,
            p =>
                p.Code == ScreeningPointCodes.SysUnclassifiedSupplement
                && p.EvidenceId == supplement.Id
        );
    }

    [Fact]
    public void Tax_accounting_years_merge_overlaps_and_ignore_unrelated_jobs()
    {
        var today = new DateOnly(2026, 11, 17);
        var milestones = new ExtractedWorkMilestone[]
        {
            new("Shop", "Sales", 2015, 1, 2020, 12, false, false),
            new("Firm A", "Tax Staff", 2020, 1, 2022, 12, false, true),
            new("Firm B", "Tax Senior", 2021, 7, 2024, 6, false, true),
        };

        var years = ScreeningEvaluator.ComputeTaxAccountingYears(milestones, today);

        // Union of [2020-01..2022-12] and [2021-07..2024-06] is 54 months = 4.5 years.
        Assert.Equal(4.5, years);
    }

    [Fact]
    public void Ai_checks_detect_all_five_discrepancy_rules()
    {
        var app = MakeApplication();
        var run = ScreeningRun.Start(
            app.Id,
            Guid.NewGuid(),
            1,
            1,
            ApplicantId,
            Now,
            TimeSpan.FromMinutes(10)
        );
        var cv = ExpertEvidence.Create(
            app,
            ApplicantId,
            "CV",
            "cv.pdf",
            "application/pdf",
            100,
            Now
        );
        var wrongCv = ExpertEvidence.Create(
            app,
            ApplicantId,
            "CV",
            "not_a_cv.pdf",
            "application/pdf",
            100,
            Now
        );
        var ev02 = ExpertEvidence.Create(
            app,
            ApplicantId,
            "EV-02",
            "ignored_cert.pdf",
            "application/pdf",
            100,
            Now
        );
        var supplement = ExpertEvidence.Create(
            app,
            ApplicantId,
            "SUPPLEMENT",
            "ignored_supplement.pdf",
            "application/pdf",
            100,
            Now
        );

        var cvExtraction = new EvidenceExtraction(
            ExtractionOutcomes.Extracted,
            false,
            false,
            false,
            null,
            "NGUYEN  MINH ANH",
            ExtractedDocumentTypes.Cv,
            ["CORPORATE_INCOME_TAX"],
            [new("Firm A", "Tax", 2022, 1, 2024, 12, false, true)],
            []
        );
        var wrongCvExtraction = new EvidenceExtraction(
            ExtractionOutcomes.Extracted,
            false,
            false,
            false,
            null,
            "Trần Thị Khác",
            ExtractedDocumentTypes.TaxCertificate,
            [],
            [],
            [
                new(
                    "Chứng chỉ hành nghề thuế",
                    "Tổng cục Thuế",
                    new DateOnly(2020, 1, 1),
                    new DateOnly(2025, 12, 31)
                ),
            ]
        );
        var ignoredNonCvExtraction = new EvidenceExtraction(
            ExtractionOutcomes.Extracted,
            false,
            false,
            false,
            null,
            "Tên khác hẳn",
            ExtractedDocumentTypes.Other,
            [],
            [],
            []
        );

        var points = ScreeningEvaluator.EvaluateAiChecks(
            run,
            MakeSnapshot(
                name: "Nguyễn Minh Ánh",
                years: 8,
                fields: ["CORPORATE_INCOME_TAX", "AUDIT"]
            ),
            [
                (cv, cvExtraction),
                (wrongCv, wrongCvExtraction),
                (ev02, ignoredNonCvExtraction),
                (supplement, ignoredNonCvExtraction),
            ],
            Now
        );

        // CV name matches accent-insensitively, while mismatched CV triggers AI checks and non-CV files are ignored.
        Assert.DoesNotContain(
            points,
            p => p.Code == ScreeningPointCodes.AiNameMismatch && p.EvidenceId == cv.Id
        );
        Assert.Contains(
            points,
            p => p.Code == ScreeningPointCodes.AiNameMismatch && p.EvidenceId == wrongCv.Id
        );
        Assert.Contains(points, p => p.Code == ScreeningPointCodes.AiExperienceMismatch);
        Assert.Contains(
            points,
            p => p.Code == ScreeningPointCodes.AiDocTypeMismatch && p.EvidenceId == wrongCv.Id
        );
        Assert.Contains(
            points,
            p => p.Code == ScreeningPointCodes.AiCertificateExpired && p.EvidenceId == wrongCv.Id
        );
        Assert.Contains(points, p => p.Code == ScreeningPointCodes.AiMissingFields);
        Assert.DoesNotContain(points, p => p.EvidenceId == ev02.Id);
        Assert.DoesNotContain(points, p => p.EvidenceId == supplement.Id);
    }

    [Fact]
    public void Checked_point_requires_reason_and_skipped_run_ignores_late_completion()
    {
        var app = MakeApplication();
        var run = ScreeningRun.Start(
            app.Id,
            Guid.NewGuid(),
            1,
            1,
            ApplicantId,
            Now,
            TimeSpan.FromMinutes(10)
        );
        var point = ScreeningPoint.Create(
            run.Id,
            app.Id,
            null,
            ScreeningPointSources.System,
            ScreeningPointCodes.SysNearMinExperience,
            "EV-06",
            "Near threshold",
            "Detail",
            null,
            null,
            Now
        );

        Assert.Equal(
            "SCREENING_REASON_REQUIRED",
            Errors.CodeOf(() => point.MarkChecked(ReviewerId, "  ", Now))
        );
        point.MarkChecked(ReviewerId, "Verified work contracts", Now);
        Assert.Equal(ScreeningPointStatuses.Checked, point.Status);
        Assert.False(point.IsOpen);

        run.MarkSkipped(Now.AddMinutes(1));
        run.MarkCompleted(3, Now.AddMinutes(2));
        Assert.Equal(ScreeningRunStatuses.Skipped, run.Status);
    }
}
