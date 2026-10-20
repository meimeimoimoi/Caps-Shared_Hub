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

    public static AppException CrawlJobNotFound() =>
        new(ErrorType.NotFound, "CRAWL_JOB_NOT_FOUND", "Crawl job not found.");

    public static AppException CrawlJobNotRunning() =>
        new(ErrorType.Conflict, "CRAWL_JOB_NOT_RUNNING", "The crawl job has already finished.");

    public static AppException InvalidCrawlJobStatus(string status) =>
        new(
            ErrorType.Validation,
            "INVALID_CRAWL_JOB_STATUS",
            $"A crawl job finishes as SUCCEEDED or FAILED, not {status}."
        );

    public static AppException InvalidDocumentSource(string source) =>
        new(ErrorType.Validation, "INVALID_DOCUMENT_SOURCE", $"Unknown document source: {source}.");

    public static AppException InvalidContentJson() =>
        new(ErrorType.Validation, "INVALID_CONTENT_JSON", "content_json must be a JSON object.");

    public static AppException FileRequired() =>
        new(ErrorType.Validation, "FILE_REQUIRED", "File is required.");

    public static AppException FileTooLarge(int maxBytes) =>
        new(
            ErrorType.Validation,
            "FILE_TOO_LARGE",
            $"File must be {maxBytes / 1024 / 1024} MB or smaller."
        );

    public static AppException FileInvalidType() =>
        new(ErrorType.Validation, "FILE_INVALID_TYPE", "Only PDF or DOCX files are allowed.");

    public static AppException InvalidEffectivePeriod() =>
        new(
            ErrorType.Validation,
            "INVALID_EFFECTIVE_PERIOD",
            "effectiveFrom must not be after effectiveTo."
        );

    public static AppException DocumentNotFound() =>
        new(ErrorType.NotFound, "DOCUMENT_NOT_FOUND", "Document not found.");

    public static AppException DocumentFileNotStored() =>
        new(
            ErrorType.NotFound,
            "DOCUMENT_FILE_NOT_STORED",
            "Only uploaded documents keep their original file; open sourceUrl instead."
        );

    public static AppException DocumentNotPending() =>
        new(
            ErrorType.Conflict,
            "DOCUMENT_NOT_PENDING",
            "The document has already been decided and can no longer change."
        );

    public static AppException InvalidParseResult() =>
        new(ErrorType.Validation, "INVALID_PARSE_RESULT", "Send either contentJson or error.");

    public static AppException DocumentDuplicate() =>
        new(ErrorType.Conflict, "DOCUMENT_DUPLICATE", "This file has already been uploaded.");

    public static AppException InternalKeyInvalid() =>
        new(ErrorType.Unauthorized, "INTERNAL_KEY_INVALID", "Missing or wrong internal key.");
}
