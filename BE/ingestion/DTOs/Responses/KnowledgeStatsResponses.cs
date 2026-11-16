namespace Caps.Ingestion.DTOs.Responses;

/// <summary>Where the document versions are right now.</summary>
/// <param name="AwaitingContent">PENDING and still waiting for the worker to split the file into articles.</param>
/// <param name="AwaitingReview">PENDING with content, waiting for a Knowledge Admin decision.</param>
/// <param name="Approved">Approved and waiting to be indexed.</param>
/// <param name="Indexed">Searchable in the knowledge base.</param>
/// <param name="ParseFailed">PENDING whose content could not be extracted (last error kept).</param>
/// <param name="IndexFailed">Approved but indexing failed (last error kept).</param>
public sealed record KnowledgePipelineResponse(
    int AwaitingContent,
    int AwaitingReview,
    int Approved,
    int Indexed,
    int Rejected,
    int ParseFailed,
    int IndexFailed
);

/// <summary>Document versions that arrived or were indexed in one calendar month (Vietnam time).</summary>
/// <param name="Start">First day of the month, yyyy-MM-dd.</param>
/// <param name="Partial">The month is still running.</param>
/// <param name="Crawled">Versions brought in by crawls.</param>
/// <param name="Uploaded">Versions uploaded by hand.</param>
/// <param name="NewDocuments">First versions indexed in the month.</param>
/// <param name="NewVersions">Later versions of known documents indexed in the month.</param>
public sealed record KnowledgeStatPeriodResponse(
    string Start,
    bool Partial,
    int Crawled,
    int Uploaded,
    int NewDocuments,
    int NewVersions
);

/// <summary>Documents with an indexed version, per document type.</summary>
public sealed record DocTypeCountResponse(string DocType, int Count);

/// <summary>How many documents waiting for review have waited this many whole days.</summary>
public sealed record PendingAgeResponse(int Days, int Count);

/// <summary>A recent crawl with what it added to the queue.</summary>
/// <param name="DocumentsFound">Documents the worker sent back.</param>
/// <param name="NewDocuments">First versions the crawl created.</param>
/// <param name="NewVersions">Later versions of known documents the crawl created.</param>
public sealed record CrawlRunSummaryResponse(
    Guid Id,
    string TriggerType,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? FinishedAt,
    int DocumentsFound,
    int NewDocuments,
    int NewVersions
);

/// <summary>Knowledge base figures for the Knowledge Admin dashboard.</summary>
/// <param name="Months">Oldest month first, ending with the current (partial) month.</param>
/// <param name="RecentRuns">The latest crawls, newest first.</param>
public sealed record KnowledgeStatsResponse(
    KnowledgePipelineResponse Pipeline,
    KnowledgeStatPeriodResponse[] Months,
    DocTypeCountResponse[] ByDocType,
    PendingAgeResponse[] PendingAges,
    CrawlRunSummaryResponse[] RecentRuns
);
