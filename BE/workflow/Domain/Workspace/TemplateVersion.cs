using System.Text.Json;
using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>One version of a template's fields (JSON schema); drafts can still change, published ones cannot.</summary>
public sealed class TemplateVersion
{
    private TemplateVersion() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid TemplateId { get; private set; }
    public Template Template { get; } = default!;

    public int VersionNo { get; private set; }
    public string FieldSchema { get; private set; } = default!; // jsonb
    public string Status { get; private set; } = TemplateVersionStatus.Draft;
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The tax year this version's form applies to; documents drafted from it cover that whole year.</summary>
    public int TaxYear { get; private set; }

    private const int MinTaxYear = 2000;
    private const int MaxTaxYear = 2100;

    /// <summary>Object storage key of the sample .docx users see their values written into; null when none was uploaded.</summary>
    public string? FileKey { get; private set; }

    /// <summary>
    /// Sets the draft's sample Word file and returns the key it replaces, so the caller can delete that file.
    /// Published versions keep theirs, like their fields.
    /// </summary>
    public string? AttachFile(byte[] content)
    {
        if (Status != TemplateVersionStatus.Draft)
            throw WorkflowErrors.TemplateNoDraft();
        // shortcut: reuses the attachment checks (ATTACHMENT_REQUIRED/TOO_LARGE/TYPE_INVALID, 50 MB); give templates their own if the FE must tell them apart
        if (Review.ReviewAttachment.DetectType(content) != Review.ReviewAttachment.Docx)
            throw WorkflowErrors.TemplateFileInvalid();
        var previous = FileKey;
        // A new key per upload, so a failed save never leaves the row pointing at half-replaced bytes
        FileKey = $"templates/{TemplateId}/{Id}/{UuidV7.NewGuid()}.docx";
        return previous;
    }

    /// <summary>The first and last day of the tax year a document drafted from this version covers.</summary>
    public (DateOnly Start, DateOnly End) TaxPeriod() =>
        (new DateOnly(TaxYear, 1, 1), new DateOnly(TaxYear, 12, 31));

    /// <summary>
    /// Saves an admin's field schema: rewrites <paramref name="latest"/> while it is a draft, otherwise
    /// starts the next version as a draft, so published versions never change. A missing
    /// <paramref name="taxYear"/> keeps the latest version's year; the first version must name one.
    /// </summary>
    public static TemplateVersion SaveDraft(
        Template template,
        TemplateVersion? latest,
        string? fieldSchema,
        Guid createdBy,
        DateTimeOffset now,
        int? taxYear = null
    )
    {
        var schema = ValidSchema(fieldSchema);
        var year = ValidTaxYear(taxYear ?? latest?.TaxYear);
        if (latest is { Status: TemplateVersionStatus.Draft })
        {
            latest.FieldSchema = schema;
            latest.TaxYear = year;
            return latest;
        }
        return new TemplateVersion
        {
            TemplateId = template.Id,
            VersionNo = (latest?.VersionNo ?? 0) + 1,
            FieldSchema = schema,
            TaxYear = year,
            CreatedBy = createdBy,
            CreatedAt = now,
        };
    }

    /// <summary>
    /// Makes this draft the version users draft from and retires <paramref name="current"/>, so a template
    /// has at most one published version.
    /// </summary>
    public void Publish(TemplateVersion? current)
    {
        if (Status != TemplateVersionStatus.Draft)
            throw WorkflowErrors.TemplateNoDraft();
        if (current != null)
            current.Status = TemplateVersionStatus.Deprecated;
        Status = TemplateVersionStatus.Published;
    }

    private static int ValidTaxYear(int? year) =>
        year is >= MinTaxYear and <= MaxTaxYear
            ? year.Value
            : throw WorkflowErrors.TemplateTaxYearInvalid();

    // The form is built from this list, so it must be a non-empty array of field objects
    private static string ValidSchema(string? json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json ?? "");
            var root = doc.RootElement;
            if (
                root.ValueKind == JsonValueKind.Array
                && root.GetArrayLength() > 0
                && root.EnumerateArray().All(f => f.ValueKind == JsonValueKind.Object)
            )
            {
                return json!;
            }
        }
        catch (JsonException) { }
        throw WorkflowErrors.FieldSchemaInvalid();
    }
}
