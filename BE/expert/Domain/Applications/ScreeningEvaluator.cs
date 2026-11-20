using System.Globalization;
using System.Text;
using System.Text.Json;
using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// Deterministic rules that produce Gate 1 screening points from submission metadata and AI-extracted fields.
/// All comparisons run in code rather than inside the LLM (Section 1, Section 2, Section 3, Section 6).
/// </summary>
public static class ScreeningEvaluator
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>
    /// Evaluates the four immediate system rules at submission time (no AI required).
    /// Images, already-detected scanned/unreadable PDFs, external links, near-threshold years,
    /// and unclassified SUPPLEMENT files produce OPEN points right away.
    /// </summary>
    public static IReadOnlyList<ScreeningPoint> EvaluateSystemChecks(
        ScreeningRun run,
        ProfileSnapshot snapshot,
        IReadOnlyList<ExpertEvidence> evidences,
        IReadOnlyDictionary<Guid, EvidenceExtraction> extractions,
        IReadOnlySet<Guid> alreadyResolvedSupplementIds,
        int minYearsExperience,
        ScreeningPolicy screeningPolicy,
        DateTimeOffset now
    )
    {
        var points = new List<ScreeningPoint>();

        foreach (var ev in evidences)
        {
            if (ev.IsLink)
            {
                points.Add(CreateExternalLinkPoint(run, ev, now));
                continue;
            }

            if (ev.RequiresAiExtraction)
            {
                extractions.TryGetValue(ev.Id, out var ext);
                if (IsUnreadableOrScan(ev, ext))
                    points.Add(CreateUnreadableOrScanPoint(run, ev, ext, now));
            }

            if (
                ev.EvidenceType == ApplicationRules.SupplementCode
                && string.IsNullOrEmpty(ev.AssignedGroup)
                && !alreadyResolvedSupplementIds.Contains(ev.Id)
            )
            {
                points.Add(CreateUnclassifiedSupplementPoint(run, ev, now));
            }
        }

        if (
            snapshot.YearsExperience is int declaredYears
            && declaredYears >= minYearsExperience
            && declaredYears <= minYearsExperience + screeningPolicy.NearThresholdExtraYears
        )
        {
            points.Add(
                ScreeningPoint.Create(
                    run.Id,
                    run.ApplicationId,
                    null,
                    ScreeningPointSources.System,
                    ScreeningPointCodes.SysNearMinExperience,
                    EligibilityCriteria.ExperienceCode,
                    "Số năm kinh nghiệm sát mức tối thiểu",
                    $"Chuyên gia khai {declaredYears} năm kinh nghiệm, sát ngưỡng tối thiểu {minYearsExperience} năm (trong biên +{screeningPolicy.NearThresholdExtraYears} năm).",
                    $"Vui lòng rà soát kỹ các mốc công việc thuế – kế toán trong CV để xác nhận đủ {minYearsExperience} năm kinh nghiệm thực tế.",
                    JsonSerializer.Serialize(
                        new
                        {
                            declaredYears,
                            minYears = minYearsExperience,
                            extraYears = screeningPolicy.NearThresholdExtraYears,
                        },
                        Json
                    ),
                    now
                )
            );
        }

        return points;
    }

    /// <summary>
    /// Creates System Check #1 for a single file when background PDF inspection detects a scan or unreadable file
    /// after submission.
    /// </summary>
    public static ScreeningPoint? EvaluatePostInspectionSystemPoint(
        ScreeningRun run,
        ExpertEvidence evidence,
        EvidenceExtraction extraction,
        IReadOnlySet<Guid> existingUnreadableEvidenceIds,
        DateTimeOffset now
    )
    {
        if (!evidence.RequiresAiExtraction || existingUnreadableEvidenceIds.Contains(evidence.Id))
        {
            return null;
        }

        return IsUnreadableOrScan(evidence, extraction)
            ? CreateUnreadableOrScanPoint(run, evidence, extraction, now)
            : null;
    }

    /// <summary>
    /// Evaluates the five AI comparison rules (2a–2e) deterministically from extracted CV metadata.
    /// Non-CV evidence files (EV-01..EV-05 and SUPPLEMENT) are never passed in or evaluated here.
    /// </summary>
    public static IReadOnlyList<ScreeningPoint> EvaluateAiChecks(
        ScreeningRun run,
        ProfileSnapshot snapshot,
        IReadOnlyList<(ExpertEvidence Evidence, EvidenceExtraction Extraction)> extractedFiles,
        DateTimeOffset now
    )
    {
        var points = new List<ScreeningPoint>();
        var today = DateOnly.FromDateTime(now.ToOffset(VietnamOffset).DateTime);
        var validFiles = extractedFiles
            .Where(x =>
                x.Evidence.RequiresAiExtraction
                && x.Extraction.Status == ExtractionOutcomes.Extracted
            )
            .ToArray();

        // 2a: Name on CV differs from declared DisplayName (accent- and case-insensitive).
        if (!string.IsNullOrWhiteSpace(snapshot.DisplayName))
        {
            var normalizedDeclared = NormalizeName(snapshot.DisplayName);
            foreach (var (ev, ext) in validFiles)
            {
                if (string.IsNullOrWhiteSpace(ext.FullName))
                    continue;
                if (NormalizeName(ext.FullName) == normalizedDeclared)
                    continue;

                points.Add(
                    ScreeningPoint.Create(
                        run.Id,
                        run.ApplicationId,
                        ev.Id,
                        ScreeningPointSources.Ai,
                        ScreeningPointCodes.AiNameMismatch,
                        CriterionForEvidenceType(
                            ev.EvidenceType,
                            ev.AssignedGroup,
                            EligibilityCriteria.ExperienceCode
                        ),
                        "Tên trên tài liệu khác tên đã khai",
                        $"Tài liệu \"{ev.FileName}\" ({ev.EvidenceType}) ghi họ tên \"{ext.FullName}\", khác với tên hồ sơ \"{snapshot.DisplayName}\".",
                        $"Tên trên tài liệu {ev.FileName} chưa trùng khớp với họ tên đăng ký ({snapshot.DisplayName}); vui lòng giải trình hoặc nộp tài liệu đúng tên.",
                        JsonSerializer.Serialize(
                            new
                            {
                                fileName = ev.FileName,
                                evidenceCode = ev.EvidenceType,
                                extractedName = ext.FullName,
                                declaredName = snapshot.DisplayName,
                            },
                            Json
                        ),
                        now
                    )
                );
            }
        }

        // 2b: Derived tax/accounting years from CV differ by >= 1 year from declared YearsExperience.
        var cvFiles = validFiles
            .Where(x => x.Evidence.EvidenceType == ApplicationRules.CvCode)
            .ToArray();
        if (cvFiles.Length > 0)
        {
            var allMilestones = cvFiles.SelectMany(x => x.Extraction.WorkMilestones).ToArray();
            if (allMilestones.Any(m => m.StartYear.HasValue))
            {
                var derivedYears = ComputeTaxAccountingYears(allMilestones, today);
                var declaredYears = snapshot.YearsExperience ?? 0;
                if (Math.Abs(derivedYears - declaredYears) >= 1.0)
                {
                    var cv = cvFiles[0].Evidence;
                    points.Add(
                        ScreeningPoint.Create(
                            run.Id,
                            run.ApplicationId,
                            cv.Id,
                            ScreeningPointSources.Ai,
                            ScreeningPointCodes.AiExperienceMismatch,
                            EligibilityCriteria.ExperienceCode,
                            "Số năm kinh nghiệm suy ra từ CV khác số đã khai",
                            $"Các mốc công việc thuế – kế toán trong CV (đã gộp khoảng trùng) tương đương {derivedYears:0.#} năm, chênh lệch với số năm đã khai ({declaredYears} năm).",
                            $"Vui lòng làm rõ các mốc thời gian làm việc thuế – kế toán trong CV (hiện suy ra {derivedYears:0.#} năm so với {declaredYears} năm đã kê khai).",
                            JsonSerializer.Serialize(
                                new
                                {
                                    derivedYears,
                                    declaredYears,
                                    threshold = 1,
                                },
                                Json
                            ),
                            now
                        )
                    );
                }
            }
        }

        // 2c: Document type does not match the uploaded evidence group.
        foreach (var (ev, ext) in validFiles)
        {
            if (string.IsNullOrWhiteSpace(ext.DocumentType))
                continue;
            var group = EffectiveGroup(ev);
            if (!IsDocumentTypeMismatch(group, ext.DocumentType))
                continue;

            points.Add(
                ScreeningPoint.Create(
                    run.Id,
                    run.ApplicationId,
                    ev.Id,
                    ScreeningPointSources.Ai,
                    ScreeningPointCodes.AiDocTypeMismatch,
                    CriterionForEvidenceType(
                        ev.EvidenceType,
                        ev.AssignedGroup,
                        EligibilityCriteria.ExperienceCode
                    ),
                    "File không đúng loại với nhóm đã tải lên",
                    $"Tài liệu \"{ev.FileName}\" tải lên nhóm {group} nhưng AI nhận diện loại tài liệu là {DocumentTypeDisplay(ext.DocumentType)}.",
                    $"Vui lòng kiểm tra và tải lại đúng loại tài liệu cho nhóm {group} (file {ev.FileName} hiện không khớp loại).",
                    JsonSerializer.Serialize(
                        new
                        {
                            fileName = ev.FileName,
                            uploadedGroup = group,
                            detectedType = ext.DocumentType,
                        },
                        Json
                    ),
                    now
                )
            );
        }

        // 2d: Certificate expired (only when an expiry date was extracted).
        foreach (var (ev, ext) in validFiles)
        {
            foreach (var cert in ext.Certificates)
            {
                if (!cert.ExpiryDate.HasValue || cert.ExpiryDate.Value >= today)
                    continue;

                var certName = string.IsNullOrWhiteSpace(cert.Name) ? ev.FileName : cert.Name;
                points.Add(
                    ScreeningPoint.Create(
                        run.Id,
                        run.ApplicationId,
                        ev.Id,
                        ScreeningPointSources.Ai,
                        ScreeningPointCodes.AiCertificateExpired,
                        CriterionForEvidenceType(
                            ev.EvidenceType,
                            ev.AssignedGroup,
                            EligibilityCriteria.ProfessionalQualification
                        ),
                        "Chứng chỉ đã hết hạn",
                        $"Chứng chỉ \"{certName}\" trong file \"{ev.FileName}\" có ngày hết hạn {cert.ExpiryDate.Value:dd/MM/yyyy}.",
                        $"Chứng chỉ \"{certName}\" đã hết hạn ({cert.ExpiryDate.Value:dd/MM/yyyy}); vui lòng nộp chứng chỉ còn hiệu lực.",
                        JsonSerializer.Serialize(
                            new
                            {
                                fileName = ev.FileName,
                                certificateName = certName,
                                issuer = cert.Issuer,
                                expiryDate = cert.ExpiryDate.Value.ToString(
                                    "yyyy-MM-dd",
                                    CultureInfo.InvariantCulture
                                ),
                            },
                            Json
                        ),
                        now
                    )
                );
            }
        }

        // 2e: Declared fields missing from CV extracted field codes.
        if (cvFiles.Length > 0 && snapshot.Fields.Length > 0)
        {
            var extractedFields = cvFiles
                .SelectMany(x => x.Extraction.FieldCodes)
                .Where(ApplicationRules.FieldCodes.Contains)
                .ToHashSet(StringComparer.Ordinal);
            var missingFields = snapshot.Fields.Where(f => !extractedFields.Contains(f)).ToArray();
            if (missingFields.Length > 0)
            {
                var cv = cvFiles[0].Evidence;
                points.Add(
                    ScreeningPoint.Create(
                        run.Id,
                        run.ApplicationId,
                        cv.Id,
                        ScreeningPointSources.Ai,
                        ScreeningPointCodes.AiMissingFields,
                        EligibilityCriteria.ExperienceCode,
                        "Lĩnh vực đã khai không thấy trong CV",
                        $"Các lĩnh vực đã đăng ký chưa thấy thể hiện rõ trong CV: {string.Join(", ", missingFields)}.",
                        $"Vui lòng bổ sung thông tin minh chứng kinh nghiệm trong CV cho các lĩnh vực đã đăng ký: {string.Join(", ", missingFields)}.",
                        JsonSerializer.Serialize(
                            new
                            {
                                missingFields,
                                extractedFields = extractedFields.ToArray(),
                                declaredFields = snapshot.Fields,
                            },
                            Json
                        ),
                        now
                    )
                );
            }
        }

        return points;
    }

    /// <summary>Creates the manual-check point attached when AI screening fails or times out (Section 4 #3).</summary>
    public static ScreeningPoint CreateManualFallbackPoint(
        ScreeningRun run,
        string reason,
        DateTimeOffset now
    ) =>
        ScreeningPoint.Create(
            run.Id,
            run.ApplicationId,
            null,
            ScreeningPointSources.System,
            ScreeningPointCodes.SysAiScreeningFailed,
            null,
            "Chưa sàng lọc được bằng AI, cần kiểm tra tay",
            reason == ScreeningFailureReasons.Timeout
                ? "Lượt sàng lọc AI vượt quá thời gian chờ cho phép. Reviewer kiểm tra trực tiếp hồ sơ hoặc bấm Chạy lại."
                : "Dịch vụ AI tạm thời không sẵn sàng khi xử lý hồ sơ. Reviewer kiểm tra trực tiếp hồ sơ hoặc bấm Chạy lại.",
            null,
            JsonSerializer.Serialize(new { reason }, Json),
            now
        );

    /// <summary>Normalizes a Vietnamese or Latin name by removing diacritics, folding đ/Đ to d, and collapsing spaces.</summary>
    public static string NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var formD = value.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        var prevSpace = false;

        foreach (var ch in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                continue;
            var mapped = ch switch
            {
                'đ' or 'Đ' => 'd',
                _ => char.ToLowerInvariant(ch),
            };
            if (char.IsWhiteSpace(mapped))
            {
                if (!prevSpace && sb.Length > 0)
                    sb.Append(' ');
                prevSpace = true;
            }
            else
            {
                sb.Append(mapped);
                prevSpace = false;
            }
        }

        return sb.ToString().Trim();
    }

    /// <summary>
    /// Computes total years of tax and accounting experience from work milestones after merging overlapping intervals.
    /// </summary>
    public static double ComputeTaxAccountingYears(
        IEnumerable<ExtractedWorkMilestone> milestones,
        DateOnly today
    )
    {
        var todayEndIdx = (today.Year * 12) + today.Month;
        var intervals = new List<(int Start, int End)>();

        foreach (var m in milestones)
        {
            if (!m.IsTaxAccounting || m.StartYear is not int startYear)
                continue;

            var startMonth = Math.Clamp(m.StartMonth ?? 1, 1, 12);
            var startIdx = (startYear * 12) + (startMonth - 1);

            int endIdx;
            if (m.IsCurrent)
            {
                endIdx = todayEndIdx;
            }
            else if (m.EndYear is int endYear)
            {
                if (m.EndMonth is int endMonth)
                {
                    endIdx = (endYear * 12) + Math.Clamp(endMonth, 1, 12);
                }
                else if (endYear > startYear)
                {
                    // Year-only spans like 2020-2025 represent 5 full years.
                    endIdx = (endYear * 12) + (startMonth - 1);
                }
                else
                {
                    endIdx = (endYear * 12) + 12;
                }
            }
            else
            {
                continue;
            }

            endIdx = Math.Min(endIdx, todayEndIdx);
            if (endIdx > startIdx)
                intervals.Add((startIdx, endIdx));
        }

        if (intervals.Count == 0)
            return 0;

        intervals.Sort(
            (a, b) => a.Start != b.Start ? a.Start.CompareTo(b.Start) : a.End.CompareTo(b.End)
        );

        var totalMonths = 0;
        var curStart = intervals[0].Start;
        var curEnd = intervals[0].End;
        for (var i = 1; i < intervals.Count; i++)
        {
            var next = intervals[i];
            if (next.Start <= curEnd)
            {
                if (next.End > curEnd)
                    curEnd = next.End;
            }
            else
            {
                totalMonths += curEnd - curStart;
                curStart = next.Start;
                curEnd = next.End;
            }
        }
        totalMonths += curEnd - curStart;

        return Math.Round(totalMonths / 12.0, 1);
    }

    /// <summary>Maps an evidence group code to the Gate 1 criterion most relevant for reviewer navigation.</summary>
    public static string? CriterionForEvidenceType(
        string evidenceType,
        string? assignedGroup = null,
        string? defaultWhenCv = null
    )
    {
        var group =
            evidenceType == ApplicationRules.SupplementCode && !string.IsNullOrEmpty(assignedGroup)
                ? assignedGroup
                : evidenceType;
        if (group == ApplicationRules.CvCode)
            return defaultWhenCv ?? EligibilityCriteria.ExperienceCode;
        return EligibilityCriteria.Codes.Contains(group) ? group : null;
    }

    private static bool IsUnreadableOrScan(ExpertEvidence ev, EvidenceExtraction? ext) =>
        ev.ContentType is FileSignature.Jpeg or FileSignature.Png
        || (ext != null && (ext.IsScanned || ext.IsUnreadable || ext.IsImage));

    private static string EffectiveGroup(ExpertEvidence ev) =>
        ev.EvidenceType == ApplicationRules.SupplementCode
        && !string.IsNullOrEmpty(ev.AssignedGroup)
            ? ev.AssignedGroup
            : ev.EvidenceType;

    private static bool IsDocumentTypeMismatch(string group, string detectedType) =>
        group switch
        {
            ApplicationRules.CvCode => detectedType != ExtractedDocumentTypes.Cv,
            EligibilityCriteria.ProfessionalQualification => detectedType
                != ExtractedDocumentTypes.TaxCertificate,
            EligibilityCriteria.ContinuingEducation => detectedType
                != ExtractedDocumentTypes.TrainingCertificate,
            EligibilityCriteria.ProfessionalEthics or EligibilityCriteria.Confidentiality =>
                detectedType == ExtractedDocumentTypes.Cv,
            _ => false,
        };

    private static string DocumentTypeDisplay(string detectedType) =>
        detectedType switch
        {
            ExtractedDocumentTypes.Cv => "CV / Sơ yếu lý lịch",
            ExtractedDocumentTypes.TaxCertificate => "Chứng chỉ thuế",
            ExtractedDocumentTypes.TrainingCertificate => "Chứng nhận đào tạo",
            _ => "Tài liệu khác",
        };

    private static ScreeningPoint CreateExternalLinkPoint(
        ScreeningRun run,
        ExpertEvidence ev,
        DateTimeOffset now
    ) =>
        ScreeningPoint.Create(
            run.Id,
            run.ApplicationId,
            ev.Id,
            ScreeningPointSources.System,
            ScreeningPointCodes.SysExternalLink,
            CriterionForEvidenceType(ev.EvidenceType, ev.AssignedGroup),
            "Link ngoài cần kiểm tra trực tiếp",
            $"Hồ sơ có liên kết ngoài ({ev.EvidenceType}): {ev.SourceUrl}. Hệ thống không tải nội dung link.",
            null,
            JsonSerializer.Serialize(
                new { evidenceCode = ev.EvidenceType, sourceUrl = ev.SourceUrl },
                Json
            ),
            now
        );

    private static ScreeningPoint CreateUnreadableOrScanPoint(
        ScreeningRun run,
        ExpertEvidence ev,
        EvidenceExtraction? ext,
        DateTimeOffset now
    )
    {
        var visionOff = ext?.Status == ExtractionOutcomes.VisionDisabled;
        var isImage =
            ev.ContentType is FileSignature.Jpeg or FileSignature.Png || (ext?.IsImage ?? false);
        var isCorrupt = ext?.UnreadableReason is "CORRUPT_PDF" or "UNSUPPORTED_FILE_FORMAT";

        var detail =
            isCorrupt ? $"File \"{ev.FileName}\" ({ev.EvidenceType}) không đọc được nội dung."
            : visionOff
                ? $"File \"{ev.FileName}\" ({ev.EvidenceType}) là {(isImage ? "ảnh chụp" : "PDF scan")}, chưa đọc được bằng AI (đã tắt đọc ảnh), cần Reviewer kiểm tra trực tiếp."
            : $"File \"{ev.FileName}\" ({ev.EvidenceType}) là {(isImage ? "ảnh chụp" : "PDF scan")}, Reviewer cần mở xem trực tiếp để đối chiếu.";

        return ScreeningPoint.Create(
            run.Id,
            run.ApplicationId,
            ev.Id,
            ScreeningPointSources.System,
            ScreeningPointCodes.SysUnreadableOrScan,
            CriterionForEvidenceType(ev.EvidenceType, ev.AssignedGroup),
            isCorrupt ? "File không đọc được" : "Ảnh chụp / PDF scan cần mở xem trực tiếp",
            detail,
            isCorrupt
                ? $"File {ev.FileName} bị lỗi hoặc không đọc được; vui lòng tải lại bản rõ nét."
                : null,
            JsonSerializer.Serialize(
                new
                {
                    fileName = ev.FileName,
                    evidenceCode = ev.EvidenceType,
                    isImage,
                    isScanned = ext?.IsScanned ?? false,
                    visionDisabled = visionOff,
                    unreadableReason = ext?.UnreadableReason,
                },
                Json
            ),
            now
        );
    }

    private static ScreeningPoint CreateUnclassifiedSupplementPoint(
        ScreeningRun run,
        ExpertEvidence ev,
        DateTimeOffset now
    ) =>
        ScreeningPoint.Create(
            run.Id,
            run.ApplicationId,
            ev.Id,
            ScreeningPointSources.System,
            ScreeningPointCodes.SysUnclassifiedSupplement,
            null,
            "File nộp bổ sung chưa xếp nhóm",
            $"File bổ sung \"{ev.FileName}\" nằm trong nhóm SUPPLEMENT và chưa được gắn vào nhóm tiêu chí nào.",
            null,
            JsonSerializer.Serialize(new { fileName = ev.FileName }, Json),
            now
        );
}
