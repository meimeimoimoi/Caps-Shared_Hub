using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>Readiness classification constants for an AI-generated document draft.</summary>
public static class DraftReadinessStatus
{
    public const string Ready = "READY";
    public const string ReadyWithWarnings = "READY_WITH_WARNINGS";
    public const string NotReady = "NOT_READY";
}

/// <summary>Severity constants for issues found during AI draft readiness evaluation.</summary>
public static class DraftIssueSeverity
{
    public const string Blocking = "BLOCKING";
    public const string Warning = "WARNING";
}

/// <summary>Category constants for issues found during AI draft readiness evaluation.</summary>
public static class DraftIssueType
{
    public const string GroundingIssue = "GROUNDING_ISSUE";
    public const string NumericalIntegrity = "NUMERICAL_INTEGRITY";
    public const string TemplateCompleteness = "TEMPLATE_COMPLETENESS";
    public const string CitationTraceability = "CITATION_TRACEABILITY";
    public const string ExpertReview = "EXPERT_REVIEW";
}

/// <summary>Machine-readable issue codes produced by draft grounding and readiness checks.</summary>
public static class DraftIssueCode
{
    public const string MissingLegalBasis = "MISSING_LEGAL_BASIS";
    public const string FabricatedLegalBasis = "FABRICATED_LEGAL_BASIS";
    public const string UngroundedLegalSection = "UNGROUNDED_LEGAL_SECTION";
    public const string UnauthorizedNumbers = "UNAUTHORIZED_NUMBERS";
    public const string MissingRequiredSection = "MISSING_REQUIRED_SECTION";
    public const string MissingOptionalField = "MISSING_OPTIONAL_FIELD";
    public const string UntraceableRequiredCitation = "UNTRACEABLE_REQUIRED_CITATION";
    public const string IncompleteCitationMetadata = "INCOMPLETE_CITATION_METADATA";
    public const string ExpertReviewRecommended = "EXPERT_REVIEW_RECOMMENDED";
}

/// <summary>A single blocking or warning issue discovered on an AI-generated draft version.</summary>
public sealed record DraftIssue(
    string Code,
    string Type,
    string Severity,
    string Description,
    string? FieldId = null,
    string? CitationId = null
);

/// <summary>Computed readiness verdict and issue list for an AI-generated draft version.</summary>
public sealed record DraftReadinessAssessment(
    string Result,
    IReadOnlyList<DraftIssue> Issues,
    int BlockingCount,
    int WarningCount
);

/// <summary>
/// Evaluates AI draft readiness per policy 03 sections 7.2-7.3:
/// any blocking issue produces NOT_READY; warnings without blocking issues produce READY_WITH_WARNINGS;
/// otherwise READY.
/// </summary>
public static class DraftReadinessEvaluator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Evaluates grounding, numerical integrity, template completeness, and citation traceability.</summary>
    public static DraftReadinessAssessment Evaluate(
        string contentJson,
        string snapshotDataJson,
        string? templateSchemaJson,
        string? citationsJson,
        bool hasUnauthorizedNumbers,
        IReadOnlyList<string> unauthorizedNumbers,
        IReadOnlyList<DraftIssue>? aiIssues = null
    )
    {
        var issues = new List<DraftIssue>();
        var seenKeys = new HashSet<(string Code, string? FieldId, string? CitationId)>();

        void AddUnique(DraftIssue issue)
        {
            var normalizedSeverity = NormalizeSeverity(issue.Severity);
            var normalized = issue with { Severity = normalizedSeverity };
            var key = (normalized.Code, normalized.FieldId, normalized.CitationId);
            if (seenKeys.Add(key))
            {
                issues.Add(normalized);
            }
        }

        if (aiIssues is not null)
        {
            foreach (var issue in aiIssues)
            {
                AddUnique(issue);
            }
        }

        // 1. Numerical integrity: unauthorized numbers not traceable to input snapshot -> BLOCKING
        if (hasUnauthorizedNumbers || unauthorizedNumbers.Count > 0)
        {
            var sample =
                unauthorizedNumbers.Count > 0
                    ? $": {string.Join(", ", unauthorizedNumbers.Take(10))}"
                    : string.Empty;
            AddUnique(
                new DraftIssue(
                    DraftIssueCode.UnauthorizedNumbers,
                    DraftIssueType.NumericalIntegrity,
                    DraftIssueSeverity.Blocking,
                    $"Phát hiện số liệu trong bản nháp không truy về được dữ liệu đầu vào (Input Snapshot){sample}."
                )
            );
        }

        // 2. Grounding & citation traceability checks
        var citations = ParseJsonArray(citationsJson);
        var hasGroundingIssue = issues.Any(i =>
            string.Equals(i.Type, DraftIssueType.GroundingIssue, StringComparison.OrdinalIgnoreCase)
        );
        if (citations.Count == 0)
        {
            if (!hasGroundingIssue)
            {
                AddUnique(
                    new DraftIssue(
                        DraftIssueCode.MissingLegalBasis,
                        DraftIssueType.GroundingIssue,
                        DraftIssueSeverity.Blocking,
                        "Không có căn cứ pháp lý đã được phê duyệt phù hợp với kỳ tính thuế và nội dung bản nháp."
                    )
                );
            }
        }
        else
        {
            EvaluateCitations(citations, AddUnique);
        }

        // 3. Template completeness checks (required -> BLOCKING, optional -> WARNING)
        var templateFields = ParseTemplateFields(templateSchemaJson);
        if (templateFields.Count > 0)
        {
            using var contentDoc = TryParseJson(contentJson);
            using var snapshotDoc = TryParseJson(snapshotDataJson);
            var contentRoot = contentDoc?.RootElement;
            var snapshotRoot = snapshotDoc?.RootElement;

            foreach (var field in templateFields)
            {
                var presentInContent =
                    contentRoot.HasValue && HasFieldValue(contentRoot.Value, field);
                var presentInSnapshot =
                    snapshotRoot.HasValue && HasFieldValue(snapshotRoot.Value, field);

                if (field.Required && !presentInContent)
                {
                    AddUnique(
                        new DraftIssue(
                            DraftIssueCode.MissingRequiredSection,
                            DraftIssueType.TemplateCompleteness,
                            DraftIssueSeverity.Blocking,
                            $"Thiếu phần/trường bắt buộc của mẫu: '{field.Label}'.",
                            FieldId: field.Id
                        )
                    );
                }
                else if (!field.Required && !presentInContent && !presentInSnapshot)
                {
                    AddUnique(
                        new DraftIssue(
                            DraftIssueCode.MissingOptionalField,
                            DraftIssueType.TemplateCompleteness,
                            DraftIssueSeverity.Warning,
                            $"Thiếu thông tin tùy chọn theo mẫu: '{field.Label}'.",
                            FieldId: field.Id
                        )
                    );
                }
            }
        }
        else if (string.IsNullOrWhiteSpace(templateSchemaJson))
        {
            AddUnique(
                new DraftIssue(
                    DraftIssueCode.ExpertReviewRecommended,
                    DraftIssueType.ExpertReview,
                    DraftIssueSeverity.Warning,
                    "Bản nháp tự do chưa gắn mẫu chuẩn; khuyến nghị chuyên gia rà soát trước khi sử dụng."
                )
            );
        }

        var blockingCount = issues.Count(i => i.Severity == DraftIssueSeverity.Blocking);
        var warningCount = issues.Count(i => i.Severity == DraftIssueSeverity.Warning);

        var result =
            blockingCount > 0 ? DraftReadinessStatus.NotReady
            : warningCount > 0 ? DraftReadinessStatus.ReadyWithWarnings
            : DraftReadinessStatus.Ready;

        return new DraftReadinessAssessment(result, issues, blockingCount, warningCount);
    }

    /// <summary>Serializes issues as JSON for jsonb storage.</summary>
    public static string SerializeIssues(IReadOnlyList<DraftIssue> issues) =>
        JsonSerializer.Serialize(issues, JsonOptions);

    /// <summary>Deserializes stored jsonb draft issues, returning an empty list when absent or invalid.</summary>
    public static IReadOnlyList<DraftIssue> DeserializeIssues(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<DraftIssue>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static void EvaluateCitations(List<JsonElement> citations, Action<DraftIssue> addIssue)
    {
        var traceableCount = citations.Count(IsTraceableCitation);
        if (traceableCount == 0)
        {
            addIssue(
                new DraftIssue(
                    DraftIssueCode.UntraceableRequiredCitation,
                    DraftIssueType.CitationTraceability,
                    DraftIssueSeverity.Blocking,
                    "Trích dẫn pháp lý bắt buộc không truy vết được nguồn gốc văn bản."
                )
            );
            return;
        }

        for (var i = 0; i < citations.Count; i++)
        {
            var item = citations[i];
            var citationId =
                ReadStringProperty(item, "document_number", "documentNumber", "docNumber")
                ?? ReadStringProperty(item, "legal_source_id", "legalSourceId")
                ?? i.ToString(CultureInfo.InvariantCulture);

            if (!IsTraceableCitation(item))
            {
                addIssue(
                    new DraftIssue(
                        DraftIssueCode.IncompleteCitationMetadata,
                        DraftIssueType.CitationTraceability,
                        DraftIssueSeverity.Warning,
                        $"Trích dẫn #{i + 1} không đủ định danh nguồn để truy vết đầy đủ.",
                        CitationId: citationId
                    )
                );
            }
            else if (!HasCompleteCitationDetails(item))
            {
                addIssue(
                    new DraftIssue(
                        DraftIssueCode.IncompleteCitationMetadata,
                        DraftIssueType.CitationTraceability,
                        DraftIssueSeverity.Warning,
                        $"Trích dẫn '{citationId}' thiếu chi tiết điều/khoản hoặc ngày hiệu lực.",
                        CitationId: citationId
                    )
                );
            }
        }
    }

    private static bool IsTraceableCitation(JsonElement citation)
    {
        if (citation.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        if (
            (TryReadBoolProperty(citation, "available", out var available) && !available)
            || (TryReadBoolProperty(citation, "synthetic", out var synthetic) && synthetic)
        )
        {
            return false;
        }

        var docNo = ReadStringProperty(citation, "document_number", "documentNumber", "docNumber");
        var sourceId = ReadStringProperty(citation, "legal_source_id", "legalSourceId");
        return !string.IsNullOrWhiteSpace(docNo) || !string.IsNullOrWhiteSpace(sourceId);
    }

    private static bool HasCompleteCitationDetails(JsonElement citation)
    {
        var hasReference =
            !string.IsNullOrWhiteSpace(ReadStringProperty(citation, "article"))
            || !string.IsNullOrWhiteSpace(ReadStringProperty(citation, "clause"))
            || !string.IsNullOrWhiteSpace(ReadStringProperty(citation, "point"));
        var hasEffectiveFrom = !string.IsNullOrWhiteSpace(
            ReadStringProperty(citation, "effective_from", "effectiveFrom")
        );
        return hasReference && hasEffectiveFrom;
    }

    private static string NormalizeSeverity(string? severity) =>
        string.Equals(severity, DraftIssueSeverity.Blocking, StringComparison.OrdinalIgnoreCase)
            ? DraftIssueSeverity.Blocking
            : DraftIssueSeverity.Warning;

    private static List<JsonElement> ParseJsonArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static JsonDocument? TryParseJson(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        try
        {
            return JsonDocument.Parse(raw);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static List<TemplateFieldSpec> ParseTemplateFields(string? templateSchemaJson)
    {
        using var doc = TryParseJson(templateSchemaJson);
        if (doc is null)
        {
            return [];
        }

        var root = doc.RootElement;
        if (root.ValueKind == JsonValueKind.Array)
        {
            return ParseFieldArray(root);
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            if (
                root.TryGetProperty("fields", out var fieldsProp)
                && fieldsProp.ValueKind == JsonValueKind.Array
            )
            {
                return ParseFieldArray(fieldsProp);
            }

            if (
                root.TryGetProperty("properties", out var props)
                && props.ValueKind == JsonValueKind.Object
            )
            {
                var requiredNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (
                    root.TryGetProperty("required", out var reqProp)
                    && reqProp.ValueKind == JsonValueKind.Array
                )
                {
                    foreach (var item in reqProp.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.String && item.GetString() is { } name)
                        {
                            requiredNames.Add(name);
                        }
                    }
                }

                var result = new List<TemplateFieldSpec>();
                foreach (var prop in props.EnumerateObject())
                {
                    var label =
                        prop.Value.ValueKind == JsonValueKind.Object
                            ? ReadStringProperty(prop.Value, "label", "title") ?? prop.Name
                            : prop.Name;
                    result.Add(
                        new TemplateFieldSpec(prop.Name, label, requiredNames.Contains(prop.Name))
                    );
                }
                return result;
            }
        }

        return [];
    }

    private static List<TemplateFieldSpec> ParseFieldArray(JsonElement array)
    {
        var result = new List<TemplateFieldSpec>();
        foreach (var item in array.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var id = ReadStringProperty(item, "id", "name", "key");
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            var label = ReadStringProperty(item, "label", "title") ?? id;
            var required = TryReadBoolProperty(item, "required", out var isRequired) && isRequired;
            result.Add(new TemplateFieldSpec(id, label, required));
        }

        return result;
    }

    private static bool HasFieldValue(JsonElement root, TemplateFieldSpec field)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        foreach (var prop in root.EnumerateObject())
        {
            if (
                string.Equals(prop.Name, field.Id, StringComparison.OrdinalIgnoreCase)
                || string.Equals(prop.Name, field.Label, StringComparison.OrdinalIgnoreCase)
            )
            {
                return IsNonEmptyJsonValue(prop.Value);
            }
        }

        if (
            root.TryGetProperty("sections", out var sections)
            && sections.ValueKind == JsonValueKind.Array
        )
        {
            foreach (var section in sections.EnumerateArray())
            {
                if (section.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var secId = ReadStringProperty(section, "id", "name");
                var secTitle = ReadStringProperty(section, "title", "label");
                if (
                    string.Equals(secId, field.Id, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(secTitle, field.Label, StringComparison.OrdinalIgnoreCase)
                )
                {
                    return section.TryGetProperty("content", out var content)
                        && IsNonEmptyJsonValue(content);
                }
            }
        }

        return false;
    }

    private static bool IsNonEmptyJsonValue(JsonElement value) =>
        value.ValueKind switch
        {
            JsonValueKind.Null or JsonValueKind.Undefined => false,
            JsonValueKind.String => !string.IsNullOrWhiteSpace(value.GetString()),
            JsonValueKind.Array => value.GetArrayLength() > 0,
            JsonValueKind.Object => value.EnumerateObject().Any(),
            _ => true,
        };

    private static string? ReadStringProperty(JsonElement obj, params string[] names)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            foreach (var name in names)
            {
                if (
                    string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase)
                    && prop.Value.ValueKind == JsonValueKind.String
                )
                {
                    var val = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                    {
                        return val.Trim();
                    }
                }
            }
        }

        return null;
    }

    private static bool TryReadBoolProperty(JsonElement obj, string name, out bool value)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            if (
                string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase)
                && prop.Value.ValueKind is JsonValueKind.True or JsonValueKind.False
            )
            {
                value = prop.Value.GetBoolean();
                return true;
            }
        }

        value = false;
        return false;
    }

    private sealed record TemplateFieldSpec(string Id, string Label, bool Required);
}
