using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Caps.Ingestion.Features.CrawlJobs;
using Caps.Ingestion.Features.Documents;

namespace Caps.Ingestion.DTOs.Requests;

/// <summary>The worker's final report on a crawl job.</summary>
/// <param name="Status">SUCCEEDED or FAILED.</param>
/// <param name="DocsFound">Documents the crawl exported.</param>
/// <param name="Detail">Summary of the exported documents, or the error.</param>
public sealed record CompleteCrawlJobRequest(
    [Required, MaxLength(16)] string Status,
    [Range(0, int.MaxValue)] int DocsFound,
    JsonElement? Detail
)
{
    public CompleteCrawlJobCommand ToCommand(Guid crawlJobId) =>
        new(
            crawlJobId,
            Status.Trim().ToUpperInvariant(),
            DocsFound,
            Detail is { } detail ? JsonSerializer.SerializeToNode(detail) : null
        );
}

/// <summary>
/// One crawler export file (schema_version 2), posted by the worker exactly as written to export/.
/// Field names follow the file (snake_case); chunks are ignored until the document is indexed.
/// </summary>
public sealed record CrawledDocumentRequest(
    [property: JsonPropertyName("schema_version")] [Range(2, 2)] int SchemaVersion,
    [property: JsonPropertyName("legal_source")] [Required] CrawledLegalSourceRequest LegalSource,
    [property: JsonPropertyName("knowledge_document")]
    [Required]
        CrawledKnowledgeDocumentRequest KnowledgeDocument
)
{
    public ImportCrawledDocumentCommand ToCommand(Guid crawlJobId)
    {
        var source = LegalSource;
        var document = KnowledgeDocument;
        if (document.ContentJson is not { ValueKind: JsonValueKind.Object } content)
            throw IngestionErrors.InvalidContentJson();
        // The worker's hints for the reviewer (suggested status, pending reasons) stay with the document
        var metadata = ObjectOrEmpty(document.Metadata);
        if (document.Ingest is { } ingest)
            metadata["ingest"] = JsonSerializer.SerializeToNode(ingest);
        var sourceMetadata = ObjectOrEmpty(source.Metadata);
        return new(
            crawlJobId,
            source.DocumentNumber.Trim(),
            source.DocType.Trim(),
            source.IssuingAuthority?.Trim(),
            source.Title.Trim(),
            sourceMetadata.ToJsonString(),
            document.Source,
            document.FileHash,
            sourceMetadata["detail_url"]?.GetValue<string>(),
            document.IssuedDate,
            document.EffectiveFrom,
            document.EffectiveTo,
            content.GetRawText(),
            metadata.ToJsonString()
        );
    }

    private static JsonObject ObjectOrEmpty(JsonElement? value) =>
        value is { ValueKind: JsonValueKind.Object } o ? JsonObject.Create(o)! : [];
}

/// <summary>The legal_source part of an export file.</summary>
public sealed record CrawledLegalSourceRequest(
    [property: JsonPropertyName("document_number")]
    [Required, MaxLength(256)]
        string DocumentNumber,
    [property: JsonPropertyName("doc_type")] [Required, MaxLength(128)] string DocType,
    [property: JsonPropertyName("issuing_authority")] [MaxLength(512)] string? IssuingAuthority,
    [property: JsonPropertyName("title")] [Required] string Title,
    [property: JsonPropertyName("metadata")] JsonElement? Metadata
);

/// <summary>The knowledge_document part of an export file.</summary>
/// <param name="Source">CRAWL_VBPL or CRAWL_MOF.</param>
/// <param name="FileHash">SHA-256 (hex) the crawler computed; the same hash is imported only once.</param>
public sealed record CrawledKnowledgeDocumentRequest(
    [property: JsonPropertyName("source")] [Required, MaxLength(32)] string Source,
    [property: JsonPropertyName("file_hash")]
    [Required, RegularExpression("^[0-9a-f]{64}$")]
        string FileHash,
    [property: JsonPropertyName("issued_date")] DateOnly? IssuedDate,
    [property: JsonPropertyName("effective_from")] DateOnly? EffectiveFrom,
    [property: JsonPropertyName("effective_to")] DateOnly? EffectiveTo,
    [property: JsonPropertyName("content_json")] [Required] JsonElement? ContentJson,
    [property: JsonPropertyName("ingest")] JsonElement? Ingest,
    [property: JsonPropertyName("metadata")] JsonElement? Metadata
);
