using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application;

/// <summary>Expert policy settings ("ExpertPolicy" section); values are policy parameters, not code (BR-E29).</summary>
public sealed class ExpertPolicyOptions
{
    /// <summary>EV-06 minimum years of tax/accounting experience (BR-E11).</summary>
    public int MinYearsExperience { get; set; } = 5;

    /// <summary>expert.reapply_not_eligible_days: wait after Gate 1 NOT_ELIGIBLE (BR-E21).</summary>
    public int ReapplyNotEligibleDays { get; set; } = 30;

    /// <summary>expert.reapply_competency_fail_days: wait after Gate 2 FAIL for the same service (BR-E22).</summary>
    public int ReapplyCompetencyFailDays { get; set; } = 90;

    /// <summary>pricing.min_price: lowest service price in VND (POL-MKT-02).</summary>
    public long PricingMinPrice { get; set; } = 1_000_000;

    /// <summary>pricing.max_price: highest service price in VND (POL-MKT-02).</summary>
    public long PricingMaxPrice { get; set; } = 10_000_000;

    /// <summary>pricing.auto_approve_max_change_percent: larger changes wait for a System Admin (BR-E17).</summary>
    public int PricingAutoApproveMaxChangePercent { get; set; } = 50;

    /// <summary>
    /// Evidence groups that must hold a file or link before submitting (BR-E02). Null uses the default:
    /// CV, legal eligibility (EV-01) and tax professional qualification (EV-02).
    /// </summary>
    public string[]? RequiredEvidenceCodes { get; set; }

    /// <summary>
    /// Statements the applicant agrees to on every submission, one entry per code and language. Null uses the
    /// default wording; ethics and confidentiality share one statement that supports EV-04 and EV-05.
    /// </summary>
    public Declaration[]? Declarations { get; set; }

    private static readonly string[] DefaultRequiredEvidenceCodes =
    [
        ApplicationRules.CvCode,
        EligibilityCriteria.LegalEligibility,
        EligibilityCriteria.ProfessionalQualification,
    ];

    private static readonly Declaration[] DefaultDeclarations =
    [
        new(
            DeclarationCodes.Accuracy,
            "vi",
            "Tôi xác nhận thông tin cung cấp trong hồ sơ này là chính xác và đầy đủ."
        ),
        new(
            DeclarationCodes.Accuracy,
            "en",
            "I confirm that the information in this application is accurate and complete."
        ),
        new(
            DeclarationCodes.ProfessionalConduct,
            "vi",
            "Tôi cam kết tuân thủ đạo đức nghề nghiệp (không thông đồng hay hỗ trợ hành vi vi phạm pháp luật thuế) và bảo mật thông tin của người dùng, chỉ sử dụng dữ liệu trong phạm vi dịch vụ."
        ),
        new(
            DeclarationCodes.ProfessionalConduct,
            "en",
            "I commit to professional ethics (no collusion in or support for tax law violations) and to keeping user information confidential, using data only within the scope of the service."
        ),
    ];

    public SubmissionPolicy Submission =>
        new(
            RequiredEvidenceCodes ?? DefaultRequiredEvidenceCodes,
            Declarations ?? DefaultDeclarations
        );

    public EligibilityPolicy Eligibility =>
        new(MinYearsExperience, TimeSpan.FromDays(ReapplyNotEligibleDays));

    public CompetencyPolicy Competency => new(TimeSpan.FromDays(ReapplyCompetencyFailDays));

    public PricingPolicy Pricing =>
        new(PricingMinPrice, PricingMaxPrice, PricingAutoApproveMaxChangePercent);
}
