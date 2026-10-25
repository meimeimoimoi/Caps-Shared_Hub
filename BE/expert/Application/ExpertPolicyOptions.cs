using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Policies;

namespace Caps.Expert.Application;

/// <summary>
/// Expert policy settings ("ExpertPolicy" section); values are policy parameters, not code (BR-E29).
/// MinYearsExperience and the reapply intervals are only defaults: a System Admin can change them at runtime,
/// so read them through IExpertPolicyProvider.
/// </summary>
public sealed class ExpertPolicyOptions
{
    /// <summary>EV-06 minimum years of tax/accounting experience (BR-E11).</summary>
    public int MinYearsExperience { get; set; } = 5;

    /// <summary>expert.reapply_not_eligible_days: wait after Gate 1 NOT_ELIGIBLE (BR-E21).</summary>
    public int ReapplyNotEligibleDays { get; set; } = 30;

    /// <summary>expert.reapply_competency_fail_days: wait after Gate 2 FAIL for the same service (BR-E22).</summary>
    public int ReapplyCompetencyFailDays { get; set; } = 90;

    /// <summary>expert.review_claim_hours: how long a reviewer keeps a claimed review.</summary>
    public int ReviewClaimHours { get; set; } = 72;

    /// <summary>expert.max_information_requests: rounds of "more information needed" per review (M4).</summary>
    public int MaxInformationRequests { get; set; } = 2;

    /// <summary>expert.review_sla_days: days a review may wait before the queue flags it (M5).</summary>
    public int ReviewSlaDays { get; set; } = 7;

    /// <summary>expert.final_approval_days: days the final approval may take before the queue flags it (D8).</summary>
    public int FinalApprovalDays { get; set; } = 3;

    /// <summary>pricing.min_fee: lowest price an expert may set, in VND (POL-MKT-02).</summary>
    public int PricingMinFee { get; set; } = 500_000;

    /// <summary>pricing.max_fee: highest price an expert may set, in VND (POL-MKT-02).</summary>
    public int PricingMaxFee { get; set; } = 30_000_000;

    /// <summary>pricing.turnaround_min_days: shortest turnaround an expert may promise.</summary>
    public int TurnaroundMinDays { get; set; } = 1;

    /// <summary>pricing.turnaround_max_days: longest turnaround an expert may promise.</summary>
    public int TurnaroundMaxDays { get; set; } = 7;

    /// <summary>pricing.platform_fee_notice_days: days ahead a platform fee change must be announced.</summary>
    public int PlatformFeeNoticeDays { get; set; } = 7;

    /// <summary>pricing.change_warning_percent: price change that shows the expert a red warning.</summary>
    public int PriceChangeWarningPercent { get; set; } = 50;

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

    /// <summary>Eligibility criteria each statement supports, by statement code. Null uses the default mapping.</summary>
    public Dictionary<string, string[]>? DeclarationCriteria { get; set; }

    /// <summary>Criteria a reviewer may mark NOT_APPLICABLE (with a reason). Null uses the default: EV-03.</summary>
    public string[]? NotApplicableCriteria { get; set; }

    private static readonly string[] DefaultRequiredEvidenceCodes =
    [
        ApplicationRules.CvCode,
        EligibilityCriteria.LegalEligibility,
        EligibilityCriteria.ProfessionalQualification,
    ];

    private static readonly Dictionary<string, string[]> DefaultDeclarationCriteria = new()
    {
        [DeclarationCodes.ProfessionalConduct] =
        [
            EligibilityCriteria.ProfessionalEthics,
            EligibilityCriteria.Confidentiality,
        ],
    };

    private static readonly string[] DefaultNotApplicableCriteria =
    [
        EligibilityCriteria.ContinuingEducation,
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
            Declarations ?? DefaultDeclarations,
            DeclarationCriteria ?? DefaultDeclarationCriteria
        );

    public string[] AllowedNotApplicableCriteria =>
        NotApplicableCriteria ?? DefaultNotApplicableCriteria;

    /// <summary>Configured defaults of the values a System Admin can change, by PolicySettingKeys name.</summary>
    public IReadOnlyDictionary<string, int> AdjustableDefaults =>
        new Dictionary<string, int>
        {
            [PolicySettingKeys.MinYearsExperience] = MinYearsExperience,
            [PolicySettingKeys.ReapplyNotEligibleDays] = ReapplyNotEligibleDays,
            [PolicySettingKeys.ReapplyCompetencyFailDays] = ReapplyCompetencyFailDays,
            [PolicySettingKeys.ReviewClaimHours] = ReviewClaimHours,
            [PolicySettingKeys.MaxInformationRequests] = MaxInformationRequests,
            [PolicySettingKeys.ReviewSlaDays] = ReviewSlaDays,
            [PolicySettingKeys.FinalApprovalDays] = FinalApprovalDays,
            [PolicySettingKeys.PricingMinFee] = PricingMinFee,
            [PolicySettingKeys.PricingMaxFee] = PricingMaxFee,
            [PolicySettingKeys.TurnaroundMinDays] = TurnaroundMinDays,
            [PolicySettingKeys.TurnaroundMaxDays] = TurnaroundMaxDays,
            [PolicySettingKeys.PlatformFeeNoticeDays] = PlatformFeeNoticeDays,
            [PolicySettingKeys.PriceChangeWarningPercent] = PriceChangeWarningPercent,
        };
}
