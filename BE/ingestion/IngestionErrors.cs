using Caps.Common.Domain;

namespace Caps.Ingestion;

/// <summary>Business error codes of the ingestion service; the FE relies on these codes.</summary>
public static class IngestionErrors
{
    public static AppException InvalidPaging(int maxPageSize) =>
        new(
            ErrorType.Validation,
            "INVALID_PAGING",
            $"page must be at least 1 and pageSize between 1 and {maxPageSize}."
        );

    public static AppException InvalidCrawlSource(string source) =>
        new(
            ErrorType.Validation,
            "INVALID_CRAWL_SOURCE",
            $"Unknown crawl source: {source}. Use vbpl or mof."
        );

    public static AppException CrawlAlreadyRunning() =>
        new(ErrorType.Conflict, "CRAWL_ALREADY_RUNNING", "A crawl job is already running.");
}
